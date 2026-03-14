import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Secret used for HMAC-based token generation.
 * Falls back to a dev-only value when WORKER_SECRET is not set.
 */
function getHmacSecret(): string {
  return process.env.WORKER_SECRET || "dev-compliance-secret";
}

// ── Token helpers ────────────────────────────────────────────────────────────

/**
 * Generate a deterministic HMAC-based unsubscribe token for a campaign lead.
 * The token encodes the campaignLeadId so we don't need a DB lookup on click.
 */
export function generateUnsubscribeToken(campaignLeadId: string): string {
  const hmac = createHmac("sha256", getHmacSecret())
    .update(campaignLeadId)
    .digest("hex");
  // Format: base64url(campaignLeadId):hmac
  const idPart = Buffer.from(campaignLeadId).toString("base64url");
  return `${idPart}.${hmac}`;
}

/**
 * Verify an unsubscribe token and extract the campaign lead ID.
 * Returns null if the token is invalid or tampered with.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const dotIndex = token.indexOf(".");
  if (dotIndex === -1) return null;

  const idPart = token.slice(0, dotIndex);
  const providedHmac = token.slice(dotIndex + 1);

  let campaignLeadId: string;
  try {
    campaignLeadId = Buffer.from(idPart, "base64url").toString("utf-8");
  } catch {
    return null;
  }

  const expectedHmac = createHmac("sha256", getHmacSecret())
    .update(campaignLeadId)
    .digest("hex");

  if (providedHmac !== expectedHmac) return null;
  return campaignLeadId;
}

// ── Suppression list ─────────────────────────────────────────────────────────

/**
 * Check whether an email address is on the global suppression list.
 */
export async function checkSuppression(
  supabase: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data } = await supabase
    .from("suppression_list")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return Boolean(data);
}

/**
 * Add an email to the global suppression list.
 * No-op if already present (UNIQUE constraint).
 */
export async function addToSuppression(
  supabase: SupabaseClient,
  email: string,
  reason: string = "unsubscribed"
): Promise<void> {
  await supabase
    .from("suppression_list")
    .upsert(
      { email: email.toLowerCase(), reason },
      { onConflict: "email" }
    );
}

// ── CAN-SPAM footer ─────────────────────────────────────────────────────────

/**
 * Build a plain-text footer containing an unsubscribe link and the sender's
 * physical mailing address (CAN-SPAM requirement).
 */
export function buildComplianceFooter(unsubscribeUrl: string): string {
  const physicalAddress =
    process.env.COMPANY_PHYSICAL_ADDRESS || "Address not configured";

  return `\n\n--\nTo unsubscribe from future emails: ${unsubscribeUrl}\n${physicalAddress}`;
}

/**
 * Build the full unsubscribe URL for a given campaign lead.
 */
export function buildUnsubscribeUrl(campaignLeadId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.ENGINE_BASE_URL ||
    "http://localhost:3000";
  const token = generateUnsubscribeToken(campaignLeadId);
  return `${baseUrl}/api/unsubscribe/${token}`;
}
