import { createClient } from "@/lib/supabase/server";
import { getThreadMessages } from "@/lib/gmail";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLeadLocale, DEFAULT_LOCALE, getLocaleCookieName, normalizeLocale } from "@/lib/lingo";
import { localizeHtmlText, localizePlainText } from "@/lib/lingo-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaignLead, error } = await supabase
    .from("campaign_leads")
    .select("*, lead:leads(*)")
    .eq("id", id)
    .single();

  if (error || !campaignLead) {
    return NextResponse.json({ error: "Campaign lead not found" }, { status: 404 });
  }

  if (!campaignLead.thread_id) {
    return NextResponse.json({ messages: [], campaignLead });
  }

  try {
    const messages = await getThreadMessages(campaignLead.thread_id);
    
    // ── Localization ─────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const userLocale = normalizeLocale(cookieStore.get(getLocaleCookieName())?.value) || DEFAULT_LOCALE;
    const leadLocale = getLeadLocale(campaignLead.lead);

    // Localize campaignLead.thread_subject
    if (campaignLead.thread_subject) {
      const subjectOriginLocale = leadLocale || DEFAULT_LOCALE;
      if (subjectOriginLocale !== userLocale) {
        try {
          campaignLead.thread_subject = await localizePlainText(
            campaignLead.thread_subject,
            userLocale,
            subjectOriginLocale
          );
        } catch (err) {
          console.warn(`Failed to translate thread subject:`, err);
        }
      }
    }
    
    // Localize messages
    // Both inbound (lead's reply) AND outbound (emails we sent, composed in the lead's language)
    // share the same origin locale — the lead's language.
    const msgOriginLocale = leadLocale || DEFAULT_LOCALE;

    const localizedMessages = await Promise.all(
      messages.map(async (msg) => {
        // If the message language differs from the user's preferred language, translate it
        if (msgOriginLocale !== userLocale) {
          try {
            const translatedBody = await localizeHtmlText(msg.body, userLocale, msgOriginLocale);
            return { ...msg, body: translatedBody };
          } catch (err) {
            console.warn(`Failed to translate message:`, err);
          }
        }
        
        return msg;
      })
    );

    return NextResponse.json({ messages: localizedMessages, campaignLead });
  } catch (err) {
    console.error("Failed to fetch thread:", err);
    return NextResponse.json(
      { error: "Failed to fetch thread from Gmail" },
      { status: 500 }
    );
  }
}
