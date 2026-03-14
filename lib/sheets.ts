import { google } from "googleapis";
import type { Lead, Campaign, CampaignLead, Log } from "@/types";

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive",
    ],
  });
}

const auth = getAuth();
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

export async function createDriveFolder(
  name: string,
  parentFolderId?: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentFolderId ? { parents: [parentFolderId] } : {}),
    },
    fields: "id",
  });
  return res.data.id!;
}

export async function shareWithUser(
  fileId: string,
  email: string
): Promise<void> {
  await drive.permissions.create({
    fileId,
    requestBody: {
      type: "user",
      role: "writer",
      emailAddress: email,
    },
  });
}

export async function createProductSheet(
  productName: string
): Promise<{ sheetId: string; folderId: string }> {
  const parentFolder = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

  const folderId = await createDriveFolder(
    `Rosey / ${productName}`,
    parentFolder || undefined
  );

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `${productName} - Rosey` },
      sheets: [
        { properties: { title: "Leads" } },
        { properties: { title: "Campaigns" } },
        { properties: { title: "Campaign_Leads" } },
        { properties: { title: "Logs" } },
        { properties: { title: "Analytics" } },
      ],
    },
  });

  const sheetId = res.data.spreadsheetId!;

  // Move sheet into folder
  await drive.files.update({
    fileId: sheetId,
    addParents: folderId,
    fields: "id, parents",
  });

  // Initialize header rows
  const headers: Record<string, string[]> = {
    Leads: ["ID", "Name", "Email", "Company", "Industry", "Tags", "Created"],
    Campaigns: ["ID", "Name", "Status", "Created"],
    Campaign_Leads: [
      "ID", "Campaign ID", "Lead ID", "Lead Name", "Lead Email",
      "Current Node", "Status", "Follow-ups", "Replied", "Last Action", "Next Action",
    ],
    Logs: ["ID", "Campaign Lead ID", "Action", "Status", "Metadata", "Created"],
    Analytics: ["Metric", "Value"],
  };

  for (const [tab, headerRow] of Object.entries(headers)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headerRow] },
    });
  }

  // Share with user if email configured
  const userEmail = process.env.GMAIL_USER_EMAIL;
  if (userEmail) {
    await shareWithUser(folderId, userEmail);
    await shareWithUser(sheetId, userEmail);
  }

  return { sheetId, folderId };
}

export async function syncLeadsToSheet(
  sheetId: string,
  leads: Lead[]
): Promise<void> {
  if (!leads.length) return;

  const rows = leads.map((l) => [
    l.id,
    l.name,
    l.email,
    l.company || "",
    l.industry || "",
    (l.tags || []).join(", "),
    l.created_at,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Leads!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

export async function syncCampaignToSheet(
  sheetId: string,
  campaign: Campaign
): Promise<void> {
  const row = [campaign.id, campaign.name, campaign.status, campaign.created_at];

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Campaigns!A:A",
  });

  const ids = existing.data.values?.map((r) => r[0]) || [];
  const rowIndex = ids.indexOf(campaign.id);

  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Campaigns!A1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Campaigns!A${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  }
}

export async function syncCampaignLeadToSheet(
  sheetId: string,
  cl: CampaignLead & { lead?: Lead }
): Promise<void> {
  const row = [
    cl.id,
    cl.campaign_id,
    cl.lead_id,
    cl.lead?.name || "",
    cl.lead?.email || "",
    cl.current_node_id,
    cl.status,
    cl.followup_count,
    cl.replied ? "Yes" : "No",
    cl.last_action_time || "",
    cl.next_action_time || "",
  ];

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Campaign_Leads!A:A",
  });

  const ids = existing.data.values?.map((r) => r[0]) || [];
  const rowIndex = ids.indexOf(cl.id);

  if (rowIndex === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "Campaign_Leads!A1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Campaign_Leads!A${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  }
}

export async function appendLog(sheetId: string, log: Log): Promise<void> {
  const row = [
    log.id,
    log.campaign_lead_id,
    log.action,
    log.status,
    log.metadata ? JSON.stringify(log.metadata) : "",
    log.created_at,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "Logs!A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });
}
