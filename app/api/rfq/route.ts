import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("attachment") as File | null;

    let attachment_url = "";
    let attachment_name = "";
    let attachment_type = "";

    if (file && file.size > 0) {
      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        return NextResponse.json(
          { success: false, error: "File size must be less than 10MB." },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "file";

      const allowed = [
        "pdf",
        "xls",
        "xlsx",
        "csv",
        "doc",
        "docx",
        "png",
        "jpg",
        "jpeg",
        "webp",
      ];

      if (!allowed.includes(ext)) {
        return NextResponse.json(
          { success: false, error: "Only PDF, Excel, CSV, Word and image files are allowed." },
          { status: 400 }
        );
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const filePath = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("rfq-files")
        .upload(filePath, file, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json(
          { success: false, error: uploadError.message },
          { status: 500 }
        );
      }

      const { data } = supabase.storage.from("rfq-files").getPublicUrl(filePath);

      attachment_url = data.publicUrl;
      attachment_name = file.name;
      attachment_type = file.type || ext;
    }

    const rfqData = {
      company_name: String(formData.get("company_name") || ""),
      contact_name: String(formData.get("contact_name") || ""),
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      country: String(formData.get("country") || ""),
      part_number: String(formData.get("part_number") || ""),
      brand: String(formData.get("brand") || ""),
      quantity: String(formData.get("quantity") || ""),
      condition_required: String(formData.get("condition_required") || ""),
      target_delivery_date: String(formData.get("target_delivery_date") || ""),
      rfq_details: String(formData.get("rfq_details") || ""),
      attachment_url,
      attachment_name,
      attachment_type,
      status: "new",
      priority: "normal",
      estimated_value: "0",
      pipeline_status: "New",
      quote_status: "Draft",
    };

    const { error } = await supabase.from("rfq_requests").insert([rfqData]);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "GlobalPLCParts RFQ <sales@globalplcparts.com>",
        to: ["sales@globalplcparts.com"],
        replyTo: rfqData.email || "sales@globalplcparts.com",
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
          <p><strong>Details:</strong><br/>${rfqData.rfq_details}</p>
          ${
            attachment_url
              ? `<p><strong>Attachment:</strong> <a href="${attachment_url}">${attachment_name}</a></p>`
              : ""
          }
        `,
      });

      if (rfqData.email) {
        await resend.emails.send({
          from: "GlobalPLCParts RFQ <sales@globalplcparts.com>",
          to: [rfqData.email],
          replyTo: "sales@globalplcparts.com",
          subject: "We received your RFQ - GlobalPLCParts",
          html: `
            <h2>Thank you for your RFQ</h2>
            <p>Hello ${rfqData.contact_name || ""},</p>
            <p>We have received your request. Our sales team will check price, stock and lead time shortly.</p>
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
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Server error",
      },
      { status: 500 }
    );
  }
}
