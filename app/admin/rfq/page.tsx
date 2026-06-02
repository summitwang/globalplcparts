"use client";

import { useMemo, useState } from "react";

type RFQ = {
  id: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  part_number?: string;
  brand?: string;
  quantity?: string;
  condition_required?: string;
  target_delivery_date?: string;
  rfq_details?: string;
  status?: string;
  internal_notes?: string;
  priority?: string;
  estimated_value?: string;
  next_follow_up?: string;
  pipeline_status?: string;
  created_at?: string;
  updated_at?: string;
};

const statuses = ["new", "contacted", "quoted", "won", "lost"];
const priorities = ["normal", "high", "vip"];
const pipelines = ["New", "Contacted", "Quoted", "Won", "Lost"];

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
      const text = await res.text();
      setError(text);
      setAuthed(false);
      return;
    }

    const json = await res.json();
    setRfqs(json.data || []);
    setAuthed(true);
  }

  async function updateRFQField(id: string, field: string, value: any) {
    const res = await fetch("/api/admin/rfq", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({
        id,
        [field]: value,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      alert(text);
      return;
    }

    setRfqs((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
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
        item.priority,
        item.pipeline_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rfqs, search]);

  const stats = useMemo(() => {
    const total = rfqs.length;
    const newCount = rfqs.filter((x) => x.status === "new").length;
    const quoted = rfqs.filter((x) => x.status === "quoted").length;
    const won = rfqs.filter((x) => x.status === "won" || x.pipeline_status === "Won").length;
    const lost = rfqs.filter((x) => x.status === "lost" || x.pipeline_status === "Lost").length;

    const pipelineValue = rfqs.reduce((sum, x) => {
      const n = Number(x.estimated_value || 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    return {
      total,
      newCount,
      quoted,
      won,
      lost,
      pipelineValue,
    };
  }, [rfqs]);

  function exportCSV() {
    const headers = [
      "created_at",
      "status",
      "pipeline_status",
      "priority",
      "estimated_value",
      "next_follow_up",
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
      "internal_notes",
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
    a.download = "globalplcparts-rfq-crm.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-3">RFQ CRM PRO MAX v2</h1>
          <p className="text-slate-600">
            Manage enquiries, priority, follow-up, estimated value and sales pipeline.
          </p>
        </div>

        {!authed && (
          <div className="bg-white border rounded-3xl p-8 max-w-xl">
            <h2 className="text-3xl font-black mb-4">Admin Login</h2>

            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-2xl px-4 py-4 mb-4"
            />

            {error && (
              <p className="text-red-600 font-bold text-sm mb-4 break-all">
                {error}
              </p>
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
            <div className="grid md:grid-cols-6 gap-5 mb-8">
              <Stat title="Total RFQs" value={stats.total} />
              <Stat title="New" value={stats.newCount} />
              <Stat title="Quoted" value={stats.quoted} />
              <Stat title="Won" value={stats.won} />
              <Stat title="Lost" value={stats.lost} />
              <Stat
                title="Pipeline Value"
                value={`$${stats.pipelineValue.toLocaleString()}`}
              />
            </div>

            <div className="bg-white border rounded-3xl p-6 mb-8 flex flex-col md:flex-row gap-4 justify-between">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company, contact, part number, country, email..."
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
                  `Quotation for ${item.part_number || "your RFQ"}`
                );

                const mailBody = encodeURIComponent(
                  `Hello ${item.contact_name || ""},\n\nThank you for your RFQ for ${item.part_number || ""}.\n\nWe are checking price, stock and lead time.\n\nBest regards,\nGlobalPLCParts`
                );

                const cleanPhone = String(item.phone || "").replace(/\D/g, "");

                return (
                  <div key={item.id} className="bg-white border rounded-3xl p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-3 mb-4">
                          <Badge text={item.status || "new"} type="status" />
                          <Badge text={item.pipeline_status || "New"} type="pipeline" />
                          <Badge text={item.priority || "normal"} type="priority" />
                          <Badge text={item.country || "No Country"} />
                          <Badge text={formatDate(item.created_at)} />
                        </div>

                        <h2 className="text-3xl font-black mb-2">
                          {item.part_number || "No Part Number"}
                        </h2>

                        <p className="text-slate-600 mb-4">
                          {item.brand || "No Brand"} · Qty: {item.quantity || "-"} ·
                          Condition: {item.condition_required || "-"}
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

                      <div className="min-w-[300px] space-y-3">
                        <select
                          value={item.status || "new"}
                          onChange={(e) =>
                            updateRFQField(item.id, "status", e.target.value)
                          }
                          className="w-full border rounded-xl px-4 py-3 font-bold"
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        <select
                          value={item.priority || "normal"}
                          onChange={(e) =>
                            updateRFQField(item.id, "priority", e.target.value)
                          }
                          className="w-full border rounded-xl px-4 py-3 font-bold"
                        >
                          {priorities.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>

                        <select
                          value={item.pipeline_status || "New"}
                          onChange={(e) =>
                            updateRFQField(item.id, "pipeline_status", e.target.value)
                          }
                          className="w-full border rounded-xl px-4 py-3 font-bold"
                        >
                          {pipelines.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>

                        <input
                          type="date"
                          value={item.next_follow_up || ""}
                          onChange={(e) =>
                            updateRFQField(item.id, "next_follow_up", e.target.value)
                          }
                          className="w-full border rounded-xl px-4 py-3 font-bold"
                        />

                        <input
                          type="number"
                          placeholder="Estimated Value USD"
                          value={item.estimated_value || ""}
                          onChange={(e) =>
                            updateRFQField(
                              item.id,
                              "estimated_value",
                              e.target.value || "0"
                            )
                          }
                          className="w-full border rounded-xl px-4 py-3 font-bold"
                        />

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

                    <div className="mt-6 bg-yellow-50 border rounded-2xl p-5">
                      <h3 className="font-black mb-2">Internal Notes</h3>
                      <textarea
                        defaultValue={item.internal_notes || ""}
                        onBlur={(e) =>
                          updateRFQField(item.id, "internal_notes", e.target.value)
                        }
                        placeholder="Private CRM notes. Example: checked stock, supplier quoted, customer budget, next action..."
                        rows={4}
                        className="w-full border rounded-2xl p-4 bg-white"
                      />
                    </div>
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

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="bg-white border rounded-3xl p-6">
      <p className="text-slate-500 mb-2">{title}</p>
      <p className="text-4xl font-black">{value}</p>
    </div>
  );
}

function Badge({
  text,
  type,
}: {
  text: string;
  type?: "status" | "priority" | "pipeline";
}) {
  const t = text.toLowerCase();

  let color = "bg-slate-100 text-slate-800 border-slate-200";

  if (type === "priority") {
    if (t === "vip") color = "bg-purple-100 text-purple-700 border-purple-200";
    if (t === "high") color = "bg-orange-100 text-orange-700 border-orange-200";
    if (t === "normal") color = "bg-blue-100 text-blue-700 border-blue-200";
  }

  if (type === "status" || type === "pipeline") {
    if (t === "won") color = "bg-green-100 text-green-700 border-green-200";
    if (t === "lost") color = "bg-red-100 text-red-700 border-red-200";
    if (t === "quoted") color = "bg-yellow-100 text-yellow-700 border-yellow-200";
    if (t === "contacted") color = "bg-blue-100 text-blue-700 border-blue-200";
    if (t === "new") color = "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <span className={`${color} border px-4 py-2 rounded-full text-sm font-black`}>
      {text}
    </span>
  );
}

function InfoLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="border rounded-xl p-3">
      <p className="text-slate-500 text-xs mb-1">{label}</p>
      <p className="font-black break-all">{value || "-"}</p>
    </div>
  );
}

function formatDate(date?: string) {
  if (!date) return "-";
  return new Date(date).toLocaleString();
}