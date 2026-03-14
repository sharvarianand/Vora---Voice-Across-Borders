import Papa from "papaparse";

export interface ParsedRow {
  /** Original column headers preserved exactly as they appear in the file */
  [key: string]: string;
}

export interface DetectedColumns {
  emailCol: string | null;
  nameCol: string | null;
  phoneCol: string | null;
  headers: string[];
}

/**
 * Parse a CSV and return raw rows with original header names.
 * Does NOT filter rows — returns everything including rows with missing fields.
 */
export function parseAnyCsv(csvText: string): ParsedRow[] {
  const result = Papa.parse<ParsedRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const criticalErrors = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parsing error: ${criticalErrors[0].message}`);
    }
  }

  return result.data;
}

const EMAIL_HEADER_VARIANTS = ["email", "e-mail", "email address", "emailaddress", "mail", "email_address"];
const NAME_HEADER_VARIANTS  = ["name", "full name", "fullname", "full_name", "display name", "contact name", "contact"];
const FIRST_NAME_VARIANTS   = ["first name", "firstname", "first_name", "given name", "givenname"];
const LAST_NAME_VARIANTS    = ["last name", "lastname", "last_name", "surname", "family name"];
const PHONE_HEADER_VARIANTS = ["phone", "mobile", "cell", "telephone", "whatsapp", "tel", "phone_number", "mobile_number", "contact_number", "phonenumber"];

/**
 * Given the parsed rows, detect which header column represents email and name.
 * Falls back to scanning cell values for "@" to find the email column.
 */
export function detectColumns(rows: ParsedRow[]): DetectedColumns {
  if (rows.length === 0) return { emailCol: null, nameCol: null, phoneCol: null, headers: [] };

  const headers = Object.keys(rows[0]);
  const lower = (s: string) => s.toLowerCase().trim();

  // Detect email column
  let emailCol = headers.find((h) => EMAIL_HEADER_VARIANTS.includes(lower(h))) ?? null;
  if (!emailCol) {
    // Scan first few cell values for "@"
    emailCol = headers.find((h) =>
      rows.slice(0, 10).some((r) => r[h]?.includes("@"))
    ) ?? null;
  }

  // Detect name column
  let nameCol = headers.find((h) => NAME_HEADER_VARIANTS.includes(lower(h))) ?? null;
  if (!nameCol) {
    // Try first_name (we'll concatenate first+last in the caller)
    nameCol = headers.find((h) => FIRST_NAME_VARIANTS.includes(lower(h))) ?? null;
  }
  if (!nameCol) {
    // Fall back to first column that isn't the email column
    nameCol = headers.find((h) => h !== emailCol) ?? null;
  }

  // Detect phone column
  const phoneCol = headers.find((h) => PHONE_HEADER_VARIANTS.includes(lower(h))) ?? null;

  return { emailCol, nameCol, phoneCol, headers };
}

/**
 * Given a raw row and detected column mapping, build the name string.
 * Tries first+last concat if separate columns exist.
 */
export function resolveName(row: ParsedRow, nameCol: string | null, headers: string[]): string {
  const lower = (s: string) => s.toLowerCase().trim();
  const firstCol = headers.find((h) => FIRST_NAME_VARIANTS.includes(lower(h)));
  const lastCol  = headers.find((h) => LAST_NAME_VARIANTS.includes(lower(h)));

  if (firstCol && lastCol) {
    const full = `${row[firstCol] ?? ""} ${row[lastCol] ?? ""}`.trim();
    if (full) return full;
  }
  if (nameCol) return row[nameCol]?.trim() ?? "";
  return "";
}

// Keep backward-compat export used elsewhere
export function extractAllFields(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out;
}

// Legacy — kept so existing imports don't break
export interface CsvLeadRow {
  name: string;
  email: string;
  company?: string;
  industry?: string;
  tags?: string;
  [key: string]: string | undefined;
}

export function parseCsv(csvText: string): CsvLeadRow[] {
  const result = Papa.parse<CsvLeadRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (result.errors.length > 0) {
    const criticalErrors = result.errors.filter((e) => e.type !== "FieldMismatch");
    if (criticalErrors.length > 0) {
      throw new Error(`CSV parsing error: ${criticalErrors[0].message}`);
    }
  }
  return result.data.filter((row) => row.name && row.email);
}
