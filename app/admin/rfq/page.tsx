"use client";

import { useMemo, useState } from "react";

type RFQ = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country: string;
  part_number: string;
  brand: string;
  quantity: string;
  condition_required: string;
  target_delivery_date: string;
  rfq_details: string;
  status: string;
  created_at: string;
};

const statuses = ["new", "quoting", "won", "lost"];

export default function AdminRFQPage() {
  const [password, setPassword] = useState("");
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadRFQs() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/rfq", {
      headers: {
        "x-admin-password": password,
      },
    });

    setLoading(false);

    if (!res.ok) {
      setError("Password incorrect or API error.");
      setAuthed(false);
      return;
    }

    const json = await res.json();
    setRfqs(json.data || []);
    setAuthed(true);
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch("/api/admin/rfq", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ id, status }),
    });

    if (res.ok) {
      setRfqs((items) =>
        items.map((item) =>
          item.id === id ? { ...item, status } : item
        )
      );
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();

    return rfqs.filter((item) =>
      [
        item.company_name,
        item.contact_name,
        item.email,
        item.phone,
        item.country,
        item.part_number,
        item.brand,
        item.quantity,
        item.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rfqs, search]);

  function exportCSV() {
    const headers = [
      "created_at",
      "status",
      "company_name",
      "contact_name",
      "email",
      "phone",
      "country",
      "part_number",
      "brand",
      "quantity",
      "condition_required",
      "target_delivery_date",
      "rfq_details",
    ];

    const rows = filtered.map((item) =>
      headers
        .map((key) => {
          const value = String(item[key as keyof RFQ] || "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "globalplcparts-rfq-requests.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-3">
            RFQ Admin Dashboard
          </h1>
          <p className="text-slate-600">
            Manage GlobalPLCParts industrial purchasing inquiries.
          </p>
        </div>

        {!authed && (
          <div className="bg-white border rounded-3xl p-8 max-w-xl">
            <h2 className="text-3xl font-black mb-4">
              Admin Login
            </h2>

            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-2xl px-4 py-4 mb-4"
            />

            {error && (
              <p className="text-red-600 font-bold mb-4">{error}</p>
            )}

            <button
              onClick={loadRFQs}
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black disabled:bg-slate-400"
            >
              {loading ? "Loading..." : "Enter Dashboard"}
            </button>
          </div>
        )}

        {authed && (
          <>
            <div className="grid md:grid-cols-4 gap-5 mb-8">
              <Stat title="Total RFQs" value={rfqs.length} />
              <Stat
                title="New"
                value={rfqs.filter((x) => x.status === "new").length}
              />
              <Stat
                title="Quoting"
                value={rfqs.filter((x) => x.status === "quoting").length}
              />
              <Stat
                title="Won"
                value={rfqs.filter((x) => x.status === "won").length}
              />
            </div>

            <div className="bg-white border rounded-3xl p-6 mb-8 flex flex-col md:flex-row gap-4 justify-between">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, part number, country, email..."
                className="border rounded-2xl px-4 py-3 flex-1"
              />

              <div className="flex gap-3">
                <button
                  onClick={loadRFQs}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black"
                >
                  Refresh
                </button>

                <button
                  onClick={exportCSV}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black"
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {filtered.map((item) => {
                const mailSubject = encodeURIComponent(
                  `Quotation for ${item.part_number}`
                );

                const mailBody = encodeURIComponent(
                  `Hello ${item.contact_name || ""},\n\nThank you for your RFQ for ${item.part_number}.\n\nWe are checking price, stock and lead time.\n\nBest regards,\nGlobalPLCParts`
                );

                const cleanPhone = String(item.phone || "").replace(/\D/g, "");

                return (
                  <div
                    key={item.id}
                    className="bg-white border rounded-3xl p-6"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div>
                        <div className="flex flex-wrap gap-3 mb-4">
                          <Badge text={item.status || "new"} />
                          <Badge text={item.country || "No Country"} />
                          <Badge text={formatDate(item.created_at)} />
                        </div>

                        <h2 className="text-3xl font-black mb-2">
                          {item.part_number || "No Part Number"}
                        </h2>

                        <p className="text-slate-600 mb-4">
                          {item.brand || "No Brand"} · Qty:{" "}
                          {item.quantity || "-"} · Condition:{" "}
                          {item.condition_required || "-"}
                        </p>

                        <div className="grid md:grid-cols-2 gap-3 text-sm">
                          <InfoLine label="Company" value={item.company_name} />
                          <InfoLine label="Contact" value={item.contact_name} />
                          <InfoLine label="Email" value={item.email} />
                          <InfoLine label="Phone" value={item.phone} />
                          <InfoLine label="Country" value={item.country} />
                          <InfoLine
                            label="Target Delivery"
                            value={item.target_delivery_date}
                          />
                        </div>
                      </div>

                      <div className="min-w-[220px] space-y-3">
                        <select
                          value={item.status || "new"}
                          onChange={(e) =>
                            updateStatus(item.id, e.target.value)
                          }
                          className="w-full border rounded-xl px-4 py-3 font-bold"
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <a
                          href={`mailto:${item.email}?subject=${mailSubject}&body=${mailBody}`}
                          className="block bg-blue-600 text-white text-center px-5 py-3 rounded-xl font-black"
                        >
                          Email Reply
                        </a>

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            className="block bg-green-500 text-white text-center px-5 py-3 rounded-xl font-black"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    {item.rfq_details && (
                      <div className="mt-6 bg-slate-50 border rounded-2xl p-5">
                        <h3 className="font-black mb-2">RFQ Details</h3>
                        <p className="whitespace-pre-wrap text-slate-700 leading-7">
                          {item.rfq_details}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <div className="bg-white border rounded-3xl p-10 text-center">
                  <h2 className="text-3xl font-black mb-2">
                    No RFQ Requests Found
                  </h2>
                  <p className="text-slate-600">
                    New RFQ submissions will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white border rounded-3xl p-6">
      <p className="text-slate-500 mb-2">{title}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span className="bg-slate-100 border px-4 py-2 rounded-full text-sm font-black">
      {text}
    </span>
  );
}

function InfoLine({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="border rounded-xl p-3">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="font-black">{value || "-"}</p>
    </div>
  );
}

function formatDate(date: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}