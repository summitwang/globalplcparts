"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const whatsappNumber = "13774696836";

export default function RequestQuotePage() {
  return (
    <Suspense fallback={<div className="p-10">Loading...</div>}>
      <RequestQuoteContent />
    </Suspense>
  );
}

function RequestQuoteContent() {
  const searchParams = useSearchParams();
  const modelFromUrl = searchParams.get("model") || "";

  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "",
    model: "",
    quantity: "1",
    message: "",
  });

  useEffect(() => {
    if (modelFromUrl) {
      setForm((prev) => ({
        ...prev,
        model: modelFromUrl,
      }));
    }
  }, [modelFromUrl]);

  function updateField(
    field: "name" | "email" | "country" | "model" | "quantity" | "message",
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function submitRFQ() {
    if (!form.name || !form.email || !form.country || !form.model) {
      alert("Please fill in your name, email, country and model number.");
      return;
    }

    const text = encodeURIComponent(
      `RFQ Request - GlobalPLCParts\n\n` +
        `Name: ${form.name}\n` +
        `Email: ${form.email}\n` +
        `Country: ${form.country}\n` +
        `Model: ${form.model}\n` +
        `Quantity: ${form.quantity || "1"}\n` +
        `Message: ${form.message || "Please quote price, availability and lead time."}`
    );

    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <Link href="/products" className="text-blue-600 font-bold">
            ← Back to Products
          </Link>

          <h1 className="text-5xl font-black mt-6 mb-4">
            Request a Quote
          </h1>

          <p className="text-slate-600 max-w-2xl leading-7">
            Send us your required model number, quantity and destination country.
            Our team will check availability, price and lead time for your
            industrial automation parts.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border rounded-3xl shadow-sm p-8">
          <h2 className="text-3xl font-black mb-6">
            RFQ Information
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <Input
              label="Your Name *"
              value={form.name}
              placeholder="Your name"
              onChange={(value) => updateField("name", value)}
            />

            <Input
              label="Email Address *"
              value={form.email}
              placeholder="your@email.com"
              onChange={(value) => updateField("email", value)}
            />

            <Input
              label="Country *"
              value={form.country}
              placeholder="Malaysia / USA / UAE..."
              onChange={(value) => updateField("country", value)}
            />

            <Input
              label="Quantity"
              value={form.quantity}
              placeholder="1"
              onChange={(value) => updateField("quantity", value)}
            />
          </div>

          <div className="mt-5">
            <Input
              label="Model Number *"
              value={form.model}
              placeholder="Example: 6ES7315-2EH14-0AB0"
              onChange={(value) => updateField("model", value)}
            />
          </div>

          <div className="mt-5">
            <label className="block text-sm font-bold text-slate-600 mb-2">
              Message / Extra Requirements
            </label>

            <textarea
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              placeholder="Please quote price, stock availability, lead time and shipping cost."
              className="w-full h-36 border rounded-2xl px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>

          <button
            onClick={submitRFQ}
            className="mt-6 w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-black text-lg"
          >
            Submit RFQ on WhatsApp
          </button>
        </div>

        <aside className="space-y-6">
          <div className="bg-white border rounded-3xl shadow-sm p-8">
            <h2 className="text-2xl font-black mb-4">What to Include</h2>

            <ul className="space-y-3 text-slate-600 leading-7">
              <li>• Exact model number</li>
              <li>• Required quantity</li>
              <li>• Destination country</li>
              <li>• New / used / refurbished requirement</li>
              <li>• Urgent delivery request if needed</li>
            </ul>
          </div>

          <div className="bg-white border rounded-3xl shadow-sm p-8">
            <h2 className="text-2xl font-black mb-4">Fast Response</h2>

            <p className="text-slate-600 leading-7">
              We usually reply within 24 hours for industrial PLC, DCS, HMI,
              controller, module and automation spare part inquiries.
            </p>
          </div>
        </aside>
      </section>

      <a
        href={`https://wa.me/${whatsappNumber}`}
        target="_blank"
        className="fixed right-6 bottom-6 z-50 bg-green-500 text-white px-6 py-4 rounded-full shadow-lg font-black"
      >
        WhatsApp
      </a>
    </main>
  );
}

function Input({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-slate-600 mb-2">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-2xl px-4 py-3 outline-none focus:border-blue-600"
      />
    </div>
  );
}