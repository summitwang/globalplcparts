import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function checkAdmin(req: Request) {
  const password = req.headers.get("x-admin-password");
  return password && password === process.env.ADMIN_PASSWORD;
}

export async function GET(req: Request) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("rfq_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(req: Request) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  if (!body.id) {
    return NextResponse.json({ error: "Missing RFQ id" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const allowedFields = [
    "status",
    "internal_notes",
    "priority",
    "estimated_value",
    "next_follow_up",
    "pipeline_status",
    "quote_unit_price",
    "quote_lead_time",
    "quote_notes",
    "quote_status",
  ];

  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  const { error } = await supabase
    .from("rfq_requests")
    .update(updateData)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
