import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rfqData = {
      company_name: body.company_name || "",
      contact_name: body.contact_name || "",
      email: body.email || "",
      phone: body.phone || "",
      country: body.country || "",
      part_number: body.part_number || "",
      brand: body.brand || "",
      quantity: body.quantity || "",
      condition_required: body.condition_required || "",
      target_delivery_date: body.target_delivery_date || "",
      rfq_details: body.rfq_details || "",
      status: "new",
      priority: "normal",
      estimated_value: "0",
      pipeline_status: "New",
    };

    const { error } = await supabase.from("rfq_requests").insert([rfqData]);

    if (error) {
      console.error("RFQ insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "GlobalPLCParts RFQ <onboarding@resend.dev>",
        to: ["sales@globalplcparts.com"],
        subject: `New RFQ Received - ${rfqData.company_name || rfqData.part_number}`,
        html: `
          <h2>New RFQ Received</h2>
          <p><strong>Company:</strong> ${rfqData.company_name}</p>
          <p><strong>Contact:</strong> ${rfqData.contact_name}</p>
          <p><strong>Email:</strong> ${rfqData.email}</p>
          <p><strong>Phone:</strong> ${rfqData.phone}</p>
          <p><strong>Country:</strong> ${rfqData.country}</p>
          <p><strong>Part Number:</strong> ${rfqData.part_number}</p>
          <p><strong>Brand:</strong> ${rfqData.brand}</p>
          <p><strong>Quantity:</strong> ${rfqData.quantity}</p>
          <p><strong>Condition:</strong> ${rfqData.condition_required}</p>
          <p><strong>Target Delivery:</strong> ${rfqData.target_delivery_date}</p>
          <p><strong>Details:</strong><br/>${rfqData.rfq_details}</p>
        `,
      });

      if (rfqData.email) {
        await resend.emails.send({
          from: "GlobalPLCParts <onboarding@resend.dev>",
          to: [rfqData.email],
          subject: "We received your RFQ - GlobalPLCParts",
          html: `
            <h2>Thank you for your RFQ</h2>
            <p>Hello ${rfqData.contact_name || ""},</p>
            <p>We have received your request and our team will check price, stock and lead time shortly.</p>
            <p><strong>Part Number:</strong> ${rfqData.part_number}</p>
            <p><strong>Brand:</strong> ${rfqData.brand}</p>
            <p><strong>Quantity:</strong> ${rfqData.quantity}</p>
            <br/>
            <p>Best regards,<br/>GlobalPLCParts Team</p>
          `,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("RFQ API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}