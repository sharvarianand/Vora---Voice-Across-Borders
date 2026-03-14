/**
 * Generate a Gmail OAuth2 refresh token with the correct scopes.
 *
 * Usage:
 *   pnpm tsx scripts/generate-gmail-token.ts
 *
 * Prerequisites: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env.local
 *
 * This spins up a temporary local server on port 3456 to capture the
 * OAuth redirect — no manual code pasting needed.
 *
 * IMPORTANT: You must add  http://localhost:3456  as an authorized redirect URI
 * in your Google Cloud Console OAuth client settings if it isn't already there.
 */

import { config } from "dotenv";
import { google } from "googleapis";
import * as http from "http";
import * as path from "path";
import * as url from "url";

// Load .env.local from project root
config({ path: path.resolve(process.cwd(), ".env.local") });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in env");
  process.exit(1);
}

const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

// Only gmail.modify — covers read, send, label, full message format.
// Do NOT include gmail.metadata — it restricts message reads to metadata-only.
const SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n=== Gmail OAuth2 Token Generator ===\n");
console.log("1. Make sure http://localhost:3456 is an authorized redirect URI");
console.log("   in your Google Cloud Console > APIs & Services > Credentials.\n");
console.log("2. Open this URL in your browser:\n");
console.log(authUrl);
console.log("\n   Waiting for OAuth redirect...\n");

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url || "", true);
  const code = parsed.query.code as string | undefined;
  const error = parsed.query.error as string | undefined;

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h2>❌ OAuth error: ${error}</h2><p>You can close this tab.</p>`);
    console.error(`\n❌ OAuth error: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<p>Waiting for auth code...</p>");
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<h2>✅ Token generated!</h2><p>Check your terminal. You can close this tab.</p>"
    );

    console.log("✅ Success! New refresh token:\n");
    console.log(tokens.refresh_token);
    console.log("\nScopes granted:", tokens.scope);
    console.log(
      "\nUpdate GMAIL_REFRESH_TOKEN in your .env.local with the value above."
    );
  } catch (err) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`<h2>❌ Token exchange failed</h2><p>${err}</p>`);
    console.error("\n❌ Failed to exchange code for token:", err);
  }

  server.close();
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Local server listening on http://localhost:${REDIRECT_PORT}`);
});
