import { google } from "googleapis";

function normalizeEmail(value: string | undefined | null): string | null {
  if (!value) return null;
  const match = value.match(/<([^>]+)>/);
  const email = (match?.[1] || value).trim().toLowerCase();
  return email || null;
}

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  htmlBody: string;
  threadId?: string;
  replyToMessageId?: string;
  /** Space-separated list of all RFC Message-IDs in the thread chain (RFC 2822 References header). */
  referencesChain?: string;
  /** URL for the List-Unsubscribe header (CAN-SPAM / RFC 8058). */
  unsubscribeUrl?: string;
}): Promise<{ messageId: string; threadId: string; rfcMessageId: string | null }> {
  const gmail = getGmailClient();
  const { to, subject, htmlBody, threadId, replyToMessageId, referencesChain, unsubscribeUrl } = params;

  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  // Use the full references chain when available; fall back to just the direct parent.
  const referencesValue = referencesChain || replyToMessageId || null;
  const messageParts = [
    `From: ${process.env.GMAIL_USER_EMAIL}`,
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    ...(replyToMessageId
      ? [
          `In-Reply-To: ${replyToMessageId}`,
          `References: ${referencesValue}`,
        ]
      : []),
    ...(unsubscribeUrl
      ? [
          `List-Unsubscribe: <${unsubscribeUrl}>`,
          `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
        ]
      : []),
    "",
    htmlBody,
  ];

  const rawMessage = Buffer.from(messageParts.join("\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: rawMessage,
      threadId: threadId || undefined,
    },
  });

  const sentMessageId = res.data.id!;
  const metadata = await gmail.users.messages.get({
    userId: "me",
    id: sentMessageId,
    format: "metadata",
    metadataHeaders: ["Message-ID"],
  });
  const messageIdHeader =
    metadata.data.payload?.headers?.find(
      (header) => header.name?.toLowerCase() === "message-id"
    )?.value || null;

  return {
    messageId: sentMessageId,
    threadId: res.data.threadId!,
    rfcMessageId: messageIdHeader,
  };
}

export async function getOrCreateLabel(name: string): Promise<string> {
  const gmail = getGmailClient();

  const res = await gmail.users.labels.list({ userId: "me" });
  const existing = res.data.labels?.find((l) => l.name === name);
  if (existing) return existing.id!;

  const created = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name,
      messageListVisibility: "show",
      labelListVisibility: "labelShow",
    },
  });
  return created.data.id!;
}

export async function applyLabelToThread(
  threadId: string,
  labelId: string
): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.threads.modify({
    userId: "me",
    id: threadId,
    requestBody: {
      addLabelIds: [labelId],
    },
  });
}

export async function applyLabelToMessage(
  messageId: string,
  labelId: string
): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: {
      addLabelIds: [labelId],
    },
  });
}

export async function hasThreadReceivedReply(
  threadId: string,
  senderEmail: string,
  expectedReplyFrom?: string | null
): Promise<boolean> {
  const gmail = getGmailClient();
  const normalizedSender = normalizeEmail(senderEmail);
  const normalizedExpectedReplyFrom = normalizeEmail(expectedReplyFrom || null);

  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["From"],
  });

  const messages = res.data.messages || [];
  if (messages.length <= 1) return false;

  return messages.slice(1).some((msg) => {
    const fromHeader = msg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === "from"
    );
    const fromEmail = normalizeEmail(fromHeader?.value);
    if (!fromEmail) return false;
    if (normalizedExpectedReplyFrom) {
      return fromEmail === normalizedExpectedReplyFrom;
    }
    return Boolean(normalizedSender && fromEmail !== normalizedSender);
  });
}

type GmailPart = {
  mimeType?: string | null;
  body?: { data?: string | null; size?: number | null } | null;
  parts?: GmailPart[] | null;
};

function decodeBase64(data: string): string {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf-8");
}

/**
 * Walk a Gmail message part tree and return the best available HTML body.
 * Strategy: depth-first, prefer text/html over text/plain.
 */
function extractBody(part: GmailPart | null | undefined): string {
  if (!part) return "";

  const mime = (part.mimeType || "").toLowerCase();

  // Leaf node with data
  if (part.body?.data) {
    const decoded = decodeBase64(part.body.data);
    if (mime.startsWith("text/plain")) {
      return decoded.replace(/\n/g, "<br>");
    }
    return decoded; // text/html or anything else with data
  }

  // Has child parts — search recursively
  if (part.parts?.length) {
    // 1st pass: prefer text/html anywhere in the tree
    for (const child of part.parts) {
      const childMime = (child.mimeType || "").toLowerCase();
      if (childMime === "text/html" && child.body?.data) {
        return decodeBase64(child.body.data);
      }
    }
    // 2nd pass: recurse into sub-multiparts (handles multipart/mixed > multipart/alternative > text/html)
    for (const child of part.parts) {
      const result = extractBody(child);
      if (result) return result;
    }
  }

  return "";
}

/**
 * Return the RFC Message-ID header of the last message in a thread.
 * Used to set In-Reply-To header for proper email threading.
 */
export async function getLastRfcMessageId(
  threadId: string
): Promise<string | null> {
  const gmail = getGmailClient();
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["Message-ID"],
  });
  const messages = res.data.messages || [];
  if (messages.length === 0) return null;
  const last = messages[messages.length - 1];
  const header = last.payload?.headers?.find(
    (h) => h.name?.toLowerCase() === "message-id"
  );
  return header?.value || null;
}

/**
 * Return ALL RFC Message-IDs in a thread as a space-separated string,
 * suitable for use as the RFC 2822 References header when composing a reply.
 */
export async function getAllRfcMessageIds(
  threadId: string
): Promise<string | null> {
  const gmail = getGmailClient();
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "metadata",
    metadataHeaders: ["Message-ID"],
  });
  const messages = res.data.messages || [];
  if (messages.length === 0) return null;
  const ids = messages
    .map((msg) =>
      msg.payload?.headers?.find(
        (h) => h.name?.toLowerCase() === "message-id"
      )?.value
    )
    .filter((v): v is string => Boolean(v));
  return ids.length > 0 ? ids.join(" ") : null;
}

export async function getThreadMessages(
  threadId: string
): Promise<import("@/types").ThreadMessage[]> {
  const gmail = getGmailClient();
  const senderEmail = (process.env.GMAIL_USER_EMAIL || "").toLowerCase();

  // Try "full" first; fall back to "metadata" if scope is restricted
  let res;
  let metadataOnly = false;
  try {
    res = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    });
  } catch (err: unknown) {
    const gErr = err as { code?: number; status?: number };
    if (gErr.code === 403 || gErr.status === 403) {
      // Scope only allows metadata — fetch without bodies
      metadataOnly = true;
      res = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "metadata",
        metadataHeaders: ["From", "To", "Subject", "Date"],
      });
    } else {
      throw err;
    }
  }

  const messages = res.data.messages || [];

  return messages.map((msg) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

    const from = getHeader("from");
    const to = getHeader("to");
    const subject = getHeader("subject");
    const date = getHeader("date");
    const body = metadataOnly ? "" : extractBody(msg.payload);

    const fromEmail = normalizeEmail(from) || "";
    const isOutbound = Boolean(
      senderEmail && fromEmail && fromEmail === senderEmail.toLowerCase()
    );

    return {
      messageId: msg.id || "",
      from,
      to,
      subject,
      date,
      body,
      isOutbound,
    };
  });
}
