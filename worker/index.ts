import { config } from "dotenv";
import { resolve } from "path";
import http from "http";

// Load .env.local so env vars are available
config({ path: resolve(process.cwd(), ".env.local") });

import {
  initWhatsApp,
  getWhatsAppStatus,
  getWhatsAppQR,
  disconnectWhatsApp,
  sendWhatsAppMessage,
  hasWhatsAppConversationReceivedReply,
} from "./whatsapp-gateway";

// ─── Config ───────────────────────────────────────────────────────────────────

const ENGINE_INTERVAL = 10_000;
const APP_URL =
  process.env.ENGINE_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3001";
const WORKER_SECRET = process.env.WORKER_SECRET || "";
const GATEWAY_PORT = Number(process.env.WHATSAPP_GATEWAY_PORT ?? 3002);

// ─── Engine tick ──────────────────────────────────────────────────────────────

async function tick() {
  try {
    const res = await fetch(`${APP_URL}/api/engine/run`, {
      method: "POST",
      headers: {
        ...(WORKER_SECRET ? { Authorization: `Bearer ${WORKER_SECRET}` } : {}),
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Engine tick failed with ${res.status}: ${body}`);
    }
    const data = await res.json();
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] Engine tick: processed=${data.processed ?? 0}, errors=${data.errors ?? 0}`
    );
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Worker error:`, err);
  }
}

// ─── WhatsApp HTTP gateway ────────────────────────────────────────────────────
// Binds to 127.0.0.1:GATEWAY_PORT (internal only).
// Routes:
//   GET  /status      → { connected, phone }
//   GET  /qr          → { qr: "<data-url>" }  |  404 if already connected
//   POST /send        → body { to, body }      → { jid, ts }
//   GET  /check-reply → ?jid=...&since=...     → { replied: bool }
//   DELETE /session   → logout + re-init

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function startGateway(): void {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${GATEWAY_PORT}`);
    const method = req.method ?? "GET";

    try {
      if (method === "GET" && url.pathname === "/status") {
        sendJson(res, 200, getWhatsAppStatus());
        return;
      }

      if (method === "GET" && url.pathname === "/qr") {
        const qr = getWhatsAppQR();
        if (!qr) {
          sendJson(res, 404, { error: "No QR available — already connected or not yet initialised" });
          return;
        }
        sendJson(res, 200, { qr });
        return;
      }

      if (method === "POST" && url.pathname === "/send") {
        const raw = await readBody(req);
        const { to, body } = JSON.parse(raw) as { to?: string; body?: string };
        if (!to || !body) {
          sendJson(res, 400, { error: "to and body are required" });
          return;
        }
        const result = await sendWhatsAppMessage(to, body);
        sendJson(res, 200, result);
        return;
      }

      if (method === "GET" && url.pathname === "/check-reply") {
        const jid = url.searchParams.get("jid");
        const since = Number(url.searchParams.get("since") ?? 0);
        if (!jid) {
          sendJson(res, 400, { error: "jid is required" });
          return;
        }
        const replied = hasWhatsAppConversationReceivedReply(jid, since);
        sendJson(res, 200, { replied });
        return;
      }

      if (method === "DELETE" && url.pathname === "/session") {
        await disconnectWhatsApp();
        sendJson(res, 200, { ok: true });
        setTimeout(() => initWhatsApp(), 3_000);
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (err) {
      console.error("[WhatsApp Gateway] Error:", err);
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Internal error",
      });
    }
  });

  server.listen(GATEWAY_PORT, "127.0.0.1", () => {
    console.log(`[WhatsApp Gateway] Listening on http://127.0.0.1:${GATEWAY_PORT}`);
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

console.log(
  `Worker started. Polling ${APP_URL}/api/engine/run every ${ENGINE_INTERVAL / 1000}s`
);

// 1. Start WhatsApp socket (will print QR to terminal on first run)
initWhatsApp().catch((err) =>
  console.error("[WhatsApp] Failed to initialise:", err)
);

// 2. Start internal HTTP gateway (Next.js engine calls this to send/check WA)
startGateway();

// 3. Start engine polling
tick();
setInterval(tick, ENGINE_INTERVAL);
