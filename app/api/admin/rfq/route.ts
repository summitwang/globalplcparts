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

  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Missing RFQ id" }, { status: 400 });
  }

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if ("status" in body) updateData.status = body.status;
  if ("internal_notes" in body) updateData.internal_notes = body.internal_notes;
  if ("priority" in body) updateData.priority = body.priority;
  if ("estimated_value" in body) updateData.estimated_value = String(body.estimated_value || "0");
  if ("next_follow_up" in body) updateData.next_follow_up = body.next_follow_up;
  if ("pipeline_status" in body) updateData.pipeline_status = body.pipeline_status;

  const { error } = await supabase
    .from("rfq_requests")
    .update(updateData)
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}