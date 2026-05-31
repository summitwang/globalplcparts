import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { error } = await supabase.from("rfq_requests").insert([
      {
        company_name: body.company_name,
        contact_name: body.contact_name,
        email: body.email,
        phone: body.phone,
        country: body.country,
        part_number: body.part_number,
        brand: body.brand,
        quantity: body.quantity,
        condition_required: body.condition_required,
        target_delivery_date: body.target_delivery_date,
        rfq_details: body.rfq_details,
        status: "new",
      },
    ]);

    if (error) {
      console.error("RFQ insert error:", error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("RFQ API error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}