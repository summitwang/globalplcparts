"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function RequestQuotePage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  async function uploadAttachment(file: File) {
    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      throw new Error("File size must be less than 10MB.");
    }

    const allowedExtensions = [
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

    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    if (!allowedExtensions.includes(ext)) {
      throw new Error("Only PDF, Excel, CSV, Word and image files are allowed.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const filePath = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("rfq-files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from("rfq-files").getPublicUrl(filePath);

    return {
      attachment_url: data.publicUrl,
      attachment_name: file.name,
      attachment_type: file.type || ext,
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const file = formData.get("attachment") as File | null;

      let attachment = {
        attachment_url: "",
        attachment_name: "",
        attachment_type: "",
      };

      if (file && file.size > 0) {
        attachment = await uploadAttachment(file);
      }

      const payload = {
        company_name: formData.get("company_name"),
        contact_name: formData.get("contact_name"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        country: formData.get("country"),
        part_number: formData.get("part_number"),
        brand: formData.get("brand"),
        quantity: formData.get("quantity"),
        condition_required: formData.get("condition_required"),
        target_delivery_date: formData.get("target_delivery_date"),
        rfq_details: formData.get("rfq_details"),
        attachment_url: attachment.attachment_url,
        attachment_name: attachment.attachment_name,
        attachment_type: attachment.attachment_type,
      };

      const res = await fetch("/api/rfq", {
  method: "POST",
  body: formData,
});

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "RFQ submission failed.");
      }

      form.reset();
      setFileName("");
      setSuccess(
        "Your RFQ has been submitted successfully. Our sales team will contact you shortly."
      );
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-black text-blue-600 uppercase tracking-widest mb-3">
            GlobalPLCParts RFQ Center
          </p>

          <h1 className="text-5xl font-black mb-4">
            Request a Quote for Industrial Automation Parts
          </h1>

          <p className="text-slate-600 text-lg max-w-3xl">
            Send us your PLC, DCS, HMI, drive, relay, module or spare parts
            request. You can also upload Excel, PDF, BOM list or product images.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
          <form
            onSubmit={handleSubmit}
            className="bg-white border rounded-3xl p-8 space-y-6 shadow-sm"
          >
            <div className="grid md:grid-cols-2 gap-5">
              <Field name="company_name" label="Company Name" required />
              <Field name="contact_name" label="Contact Name" required />
              <Field name="email" label="Email Address" type="email" required />
              <Field name="phone" label="Phone / WhatsApp" />
              <Field name="country" label="Country" required />
              <Field name="part_number" label="Part Number / Model" required />
              <Field name="brand" label="Brand" />
              <Field name="quantity" label="Quantity" />
              <Field name="condition_required" label="Condition Required" />
              <Field
                name="target_delivery_date"
                label="Target Delivery Date"
                type="date"
              />
            </div>

            <div>
              <label className="block font-black mb-2">RFQ Details</label>
              <textarea
                name="rfq_details"
                rows={6}
                placeholder="Please describe your required parts, lead time, condition, delivery country or any other requirements."
                className="w-full border rounded-2xl px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            <div className="bg-slate-50 border rounded-2xl p-5">
              <label className="block font-black mb-2">
                Upload Excel / PDF / BOM / Image
              </label>

              <input
                type="file"
                name="attachment"
                accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              />

              <p className="text-sm text-slate-500 mt-2">
                Supported: PDF, Excel, CSV, Word, JPG, PNG, WEBP. Max size:
                10MB.
              </p>

              {fileName && (
                <p className="mt-3 text-sm font-bold text-blue-700">
                  Selected file: {fileName}
                </p>
              )}
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 font-bold">
                {success}
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xl disabled:bg-slate-400"
            >
              {loading ? "Submitting RFQ..." : "Submit RFQ"}
            </button>
          </form>

          <aside className="space-y-5">
            <div className="bg-white border rounded-3xl p-6 shadow-sm">
              <h2 className="text-2xl font-black mb-4">
                What You Can Upload
              </h2>

              <ul className="space-y-3 text-slate-700">
                <li>✓ Excel BOM list</li>
                <li>✓ PDF procurement list</li>
                <li>✓ Word purchase request</li>
                <li>✓ Product label image</li>
                <li>✓ PLC / DCS spare parts list</li>
              </ul>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl p-6">
              <h2 className="text-2xl font-black mb-4">Fast RFQ Response</h2>

              <p className="text-slate-300 leading-7">
                Our sales team will check stock, price, condition and lead time
                after receiving your request.
              </p>

              <div className="mt-5 space-y-2 text-sm">
                <p>Email: sales@globalplcparts.com</p>
                <p>Worldwide Industrial Parts Supply</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6">
              <h2 className="text-xl font-black mb-3">Common Parts</h2>
              <p className="text-slate-700 leading-7">
                Siemens, Allen-Bradley, ABB, Schneider, Honeywell, Yokogawa,
                Emerson, GE Fanuc, Bently Nevada, Foxboro and more.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block font-black mb-2">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full border rounded-2xl px-4 py-3 outline-none focus:border-blue-600"
      />
    </div>
  );
}