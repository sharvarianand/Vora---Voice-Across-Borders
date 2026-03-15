/**
 * Minimal Baileys test — runs standalone to debug QR/connection issues
 * Run: npx tsx worker/test-wa.ts
 */

import makeWASocket, {
  useMultiFileAuthState as createBaileysAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { resolve } from "path";

const AUTH_DIR = resolve(process.cwd(), "whatsapp-session-test");

async function run() {
  console.log("[Test] Starting Baileys v7 test...");
  const { state, saveCreds } = await createBaileysAuthState(AUTH_DIR);
  console.log("[Test] Auth state loaded, has creds:", !!state.creds?.me);

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    logger: {
      level: "error",
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: (...a: unknown[]) => console.log("[BA WARN]", ...a),
      error: (...a: unknown[]) => console.error("[BA ERROR]", ...a),
      fatal: (...a: unknown[]) => console.error("[BA FATAL]", ...a),
      child: () =>
        ({
          trace: () => {},
          debug: () => {},
          info: () => {},
          warn: (...a: unknown[]) => console.log("[BA WARN]", ...a),
          error: (...a: unknown[]) => console.error("[BA ERROR]", ...a),
          fatal: () => {},
          child: () => ({} as never),
        } as never),
    } as never,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    console.log("[Test] connection.update keys:", Object.keys(update));
    const { connection, lastDisconnect, qr, isNewLogin } = update;
    console.log("[Test] connection:", connection, "| isNewLogin:", isNewLogin, "| qr present:", !!qr);

    if (qr) {
      console.log("[Test] ✅ GOT QR — first 50 chars:", qr.substring(0, 50));
    }

    if (connection === "close") {
      const err = lastDisconnect?.error;
      const boom = err as Boom;
      console.error("[Test] Close error raw:", err?.message);
      console.error("[Test] Close boom output:", JSON.stringify(boom?.output));
      const code = boom?.output?.statusCode;
      console.log("[Test] Close code:", code, "loggedOut?", code === DisconnectReason.loggedOut);
    }

    if (connection === "open") {
      console.log("[Test] ✅ Connected!");
    }
  });

  // Keep alive
  setTimeout(() => {
    console.log("[Test] Timeout — exiting");
    process.exit(0);
  }, 30_000);
}

run().catch(console.error);
