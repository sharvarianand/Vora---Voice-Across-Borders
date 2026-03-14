/**
 * worker/whatsapp-gateway.ts
 *
 * Manages a single persistent Baileys (WA Web) WebSocket.
 * Only imported by worker/index.ts — never by Next.js routes (no @/ alias here).
 *
 * Exported helpers:
 *   initWhatsApp()
 *   sendWhatsAppMessage(to, body)
 *   hasWhatsAppConversationReceivedReply(jid, since_ts)
 *   getWhatsAppStatus()
 *   getWhatsAppQR()
 *   disconnectWhatsApp()
 */

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { resolve } from "path";

// ─── Mutable state ────────────────────────────────────────────────────────────

let sock: WASocket | null = null;
let isConnected = false;
let connectedPhone: string | null = null;
let currentQR: string | null = null; // base64 PNG data URL

/** In-memory message store for reply detection.
 *  jid → [{ ts (ms), fromMe, senderJid }]
 */
const receivedMessages = new Map<
  string,
  Array<{ ts: number; fromMe: boolean; senderJid: string }>
>();

const AUTH_DIR = resolve(process.cwd(), "whatsapp-session");

// ─── Init / reconnect ─────────────────────────────────────────────────────────

export async function initWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    // Silence Baileys' verbose debug output
    logger: {
      level: "silent",
      trace: () => {}, debug: () => {}, info: () => {},
      warn: () => {}, error: () => {}, fatal: () => {},
      child: () => ({ trace: () => {}, debug: () => {}, info: () => {},
        warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({} as never) }),
    } as never,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      isConnected = false;
      // Print QR to terminal (printQRInTerminal is deprecated in v7)
      try {
        const qrText = await qrcode.toString(qr, { type: "terminal", small: true });
        console.log(qrText);
      } catch {
        console.log("[WhatsApp] QR generated — open /api/whatsapp/qr in the browser to scan");
      }
      // Also expose as base64 PNG for the web UI
      try {
        currentQR = await qrcode.toDataURL(qr);
      } catch {
        currentQR = null;
      }
      console.log("[WhatsApp] QR ready — scan above or open /api/whatsapp/qr in the browser");
    }

    if (connection === "open") {
      isConnected = true;
      currentQR = null;
      connectedPhone = sock?.user?.id?.split(":")[0] ?? null;
      console.log(`[WhatsApp] Connected as +${connectedPhone ?? "unknown"}`);
    }

    if (connection === "close") {
      isConnected = false;
      connectedPhone = null;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        `[WhatsApp] Connection closed (code=${statusCode}), reconnect=${shouldReconnect}`
      );
      if (shouldReconnect) {
        setTimeout(() => initWhatsApp(), 5_000);
      } else {
        // Logged out — clear socket; next initWhatsApp() will show a fresh QR
        sock = null;
      }
    }
  });

  // Track incoming messages so reply-detection works in-process
  sock.ev.on("messages.upsert", ({ messages }) => {
    for (const msg of messages) {
      const jid = msg.key.remoteJid;
      if (!jid) continue;
      // Baileys gives seconds; we store ms
      const ts = Number(msg.messageTimestamp ?? 0) * 1000;
      const fromMe = msg.key.fromMe ?? false;
      const senderJid = msg.key.participant ?? jid;

      if (!receivedMessages.has(jid)) receivedMessages.set(jid, []);
      receivedMessages.get(jid)!.push({ ts, fromMe, senderJid });
    }
  });
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export function getWhatsAppStatus(): { connected: boolean; phone: string | null } {
  return { connected: isConnected, phone: connectedPhone };
}

/** Returns the current QR as a base64 PNG data URL, or null if already connected. */
export function getWhatsAppQR(): string | null {
  return currentQR;
}

export async function disconnectWhatsApp(): Promise<void> {
  if (sock) {
    await sock.logout().catch(() => {});
    sock = null;
  }
  isConnected = false;
  connectedPhone = null;
  currentQR = null;
  receivedMessages.clear();
}

/**
 * Convert any phone string to a Baileys JID.
 * "+44 7700 900000" → "447700900000@s.whatsapp.net"
 */
function phoneToJid(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

export interface SendWhatsAppResult {
  jid: string;
  ts: number; // Unix ms
}

export async function sendWhatsAppMessage(
  to: string,
  body: string
): Promise<SendWhatsAppResult> {
  if (!sock || !isConnected) {
    throw new Error("WhatsApp socket is not connected");
  }
  const jid = phoneToJid(to);
  const sent = await sock.sendMessage(jid, { text: body });
  const ts = Number(sent?.messageTimestamp ?? 0) * 1000 || Date.now();
  return { jid, ts };
}

/**
 * Returns true if the conversation has received at least one inbound message
 * (not from us) after `since_ts` (Unix ms).
 */
export function hasWhatsAppConversationReceivedReply(
  jid: string,
  since_ts: number
): boolean {
  const msgs = receivedMessages.get(jid) ?? [];
  return msgs.some((m) => !m.fromMe && m.ts > since_ts);
}
