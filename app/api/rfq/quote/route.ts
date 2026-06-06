import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, adminPassword } = body;

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rfq, error } = await supabase
      .from("rfq_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !rfq) {
      return NextResponse.json({ error: "RFQ not found" }, { status: 404 });
    }

    if (!rfq.email) {
      return NextResponse.json(
        { error: "Customer email missing" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "GlobalPLCParts RFQ <sales@globalplcparts.com>",
      to: [rfq.email],
      replyTo: "sales@globalplcparts.com",
      subject: `Quotation for ${rfq.part_number || "your RFQ"} - GlobalPLCParts`,
      html: `
        <h2>Quotation from GlobalPLCParts</h2>

        <p>Dear ${rfq.contact_name || "Customer"},</p>

        <p>Thank you for your RFQ. Please find our quotation details below:</p>

        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse:collapse;">
          <tr><td><strong>Company</strong></td><td>${rfq.company_name || "-"}</td></tr>
          <tr><td><strong>Part Number</strong></td><td>${rfq.part_number || "-"}</td></tr>
          <tr><td><strong>Brand</strong></td><td>${rfq.brand || "-"}</td></tr>
          <tr><td><strong>Quantity</strong></td><td>${rfq.quantity || "-"}</td></tr>
          <tr><td><strong>Condition</strong></td><td>${rfq.condition_required || "-"}</td></tr>
          <tr><td><strong>Unit Price</strong></td><td>${rfq.quote_unit_price || "Please confirm"}</td></tr>
          <tr><td><strong>Lead Time</strong></td><td>${rfq.quote_lead_time || "Please confirm"}</td></tr>
        </table>

        <p><strong>Notes:</strong><br/>
        ${rfq.quote_notes || "Price and stock are subject to final confirmation."}
        </p>

        ${
          rfq.attachment_url
            ? `<p><strong>Your RFQ Attachment:</strong> <a href="${rfq.attachment_url}">${rfq.attachment_name || "Download file"}</a></p>`
            : ""
        }

        <p>Please reply to this email if you would like to proceed.</p>

        <br/>

        <p>
          Best regards,<br/>
          GlobalPLCParts Team<br/>
          Worldwide Industrial Parts Supply
        </p>
      `,
    });

    await supabase
      .from("rfq_requests")
      .update({
        quote_status: "Sent",
        quote_generated_at: new Date().toISOString(),
        quote_sent_at: new Date().toISOString(),
        pipeline_status: "Quoted",
        status: "quoted",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Quote email failed" },
      { status: 500 }
    );
  }
}