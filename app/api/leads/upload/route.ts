import { createClient } from "@/lib/supabase/server";
import { parseAnyCsv, detectColumns, resolveName } from "@/lib/csv";
import { NextRequest, NextResponse } from "next/server";

type LeadInsert = {
  product_id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  industry: string | null;
  tags: string[];
  custom_fields: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const productId = formData.get("productId") as string | null;

  if (!file || !productId) {
    return NextResponse.json(
      { error: "file and productId are required" },
      { status: 400 }
    );
  }

  const fileText = await file.text();
  const isJson =
    file.name.toLowerCase().endsWith(".json") ||
    file.type === "application/json";

  let leadsToInsert: LeadInsert[];

  if (isJson) {
    let parsed: Record<string, unknown>[];
    try {
      const raw = JSON.parse(fileText);
      parsed = Array.isArray(raw) ? raw : [raw];
    } catch {
      return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
    }
    if (parsed.length === 0) {
      return NextResponse.json({ error: "No rows found in JSON" }, { status: 400 });
    }

    // Use first row headers as the column spec
    const headers = Object.keys(parsed[0]);
    const strRows = parsed.map((r) =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")]))
    );
    const { emailCol, nameCol, phoneCol } = detectColumns(strRows);

    if (!emailCol) {
      return NextResponse.json(
        { error: "Could not detect an email column. Please include a column with email addresses." },
        { status: 400 }
      );
    }

    const lower = (s: string) => s.toLowerCase().trim();
    const mapped = strRows
      .map((row) => {
        const email = row[emailCol]?.trim();
        if (!email || !email.includes("@")) return null;
        const name = resolveName(row, nameCol, headers) || email;
        const companyCol = headers.find((h) => lower(h) === "company");
        const industryCol = headers.find((h) => lower(h) === "industry");
        const tagsCol = headers.find((h) => lower(h) === "tags");
        const rawTags = tagsCol ? row[tagsCol] ?? "" : "";
        return {
          product_id: productId,
          name,
          email,
          phone: phoneCol ? row[phoneCol]?.trim() || null : null,
          company: companyCol ? row[companyCol]?.trim() || null : null,
          industry: industryCol ? row[industryCol]?.trim() || null : null,
          tags: rawTags
            ? String(rawTags).split(",").map((t) => t.trim()).filter(Boolean)
            : [],
          custom_fields: row,
        } satisfies LeadInsert;
      });
    leadsToInsert = mapped.filter((r) => r !== null) as LeadInsert[];
  } else {
    // CSV path — accept any column structure
    let rows: Record<string, string>[];
    try {
      rows = parseAnyCsv(fileText);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to parse CSV" },
        { status: 400 }
      );
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows found in CSV" }, { status: 400 });
    }

    const headers = Object.keys(rows[0]);
    const { emailCol, nameCol, phoneCol } = detectColumns(rows);

    if (!emailCol) {
      return NextResponse.json(
        {
          error:
            "Could not detect an email column. Please include a column named 'email' or containing email addresses.",
        },
        { status: 400 }
      );
    }

    const lower = (s: string) => s.toLowerCase().trim();
    const csvMapped = rows
      .map((row) => {
        const email = row[emailCol]?.trim();
        if (!email || !email.includes("@")) return null;
        const name = resolveName(row, nameCol, headers) || email;
        const companyCol = headers.find((h) => lower(h) === "company");
        const industryCol = headers.find((h) => lower(h) === "industry");
        const tagsCol = headers.find((h) => lower(h) === "tags");
        const rawTags = tagsCol ? row[tagsCol] ?? "" : "";
        return {
          product_id: productId,
          name,
          email,
          phone: phoneCol ? row[phoneCol]?.trim() || null : null,
          company: companyCol ? row[companyCol]?.trim() || null : null,
          industry: industryCol ? row[industryCol]?.trim() || null : null,
          tags: rawTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          custom_fields: row,
        } satisfies LeadInsert;
      });
    leadsToInsert = csvMapped.filter((r) => r !== null) as LeadInsert[];
  }

  if (leadsToInsert.length === 0) {
    return NextResponse.json(
      { error: "No valid rows found — every row was missing a valid email address." },
      { status: 400 }
    );
  }

  // Try with custom_fields; fall back without if column doesn't exist yet
  let { data, error } = await supabase
    .from("leads")
    .upsert(leadsToInsert, { onConflict: "product_id,email" })
    .select();

  if (error && error.message.includes("custom_fields")) {
    const fallback = leadsToInsert.map(({ custom_fields: _cf, ...rest }) => rest);
    ({ data, error } = await supabase
      .from("leads")
      .upsert(fallback, { onConflict: "product_id,email" })
      .select());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    imported: data!.length,
    total: leadsToInsert.length,
    ids: data!.map((r: { id: string }) => r.id),
  });
}

