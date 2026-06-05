import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // RFQ 数据
    const rfqData = {
      rfq_id: body.rfq_id || "",
      quote_generated: new Date().toISOString(),
      quote_status: body.quote_status || "Draft",
      quote_sent: null,
      sales_note: body.sales_note || "",
      estimated_value: body.estimated_value || "",
      pipeline_status: body.pipeline_status || "New",
    };

    // 插入数据库
    const { error } = await supabase
      .from("rfq_requests")
      .update(rfqData)
      .eq("id", body.rfq_id);

    if (error) {
      console.error("RFQ update error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // 内部邮件通知
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "GlobalPLCParts RFQ <sales@globalplcparts.com>",
        to: ["sales@globalplcparts.com"],
        subject: `New Quote Generated - RFQ ${rfqData.rfq_id}`,
        html: `
          <h2>New Quote Generated</h2>
          <p><strong>RFQ ID:</strong> ${rfqData.rfq_id}</p>
          <p><strong>Status:</strong> ${rfqData.quote_status}</p>
          <p><strong>Estimated Value:</strong> ${rfqData.estimated_value}</p>
          <p><strong>Sales Note:</strong> ${rfqData.sales_note}</p>
          <p><strong>Pipeline:</strong> ${rfqData.pipeline_status}</p>
        `,
      });

      // 客户邮件通知
      if (body.customer_email) {
        await resend.emails.send({
          from: "GlobalPLCParts <sales@globalplcparts.com>",
          to: [body.customer_email],
          subject: `Your RFQ has been processed - GlobalPLCParts`,
          html: `
            <h2>Thank you for your RFQ</h2>
            <p>Hello ${body.customer_name || ""},</p>
            <p>We have generated a quote for your request. Our sales team will contact you shortly.</p>
            <p><strong>RFQ ID:</strong> ${rfqData.rfq_id}</p>
            <p><strong>Status:</strong> ${rfqData.quote_status}</p>
            <p><strong>Estimated Value:</strong> ${rfqData.estimated_value}</p>
            <br/>
            <p>Best regards,<br/>GlobalPLCParts Team</p>
          `,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("RFQ Quote API error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}