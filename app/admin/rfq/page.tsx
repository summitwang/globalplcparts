"use client";

import { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

type RFQ = {
  id: string;
  created_at?: string;
  company_name?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  country?: string;
  part_number?: string;
  brand?: string;
  quantity?: string | number;
  condition_required?: string;
  target_delivery_date?: string;
  rfq_details?: string;
  status?: string;
  priority?: string;
  estimated_value?: string | number;
  pipeline_status?: string;
  internal_notes?: string;
  quote_status?: string;
  quote_generated?: boolean;
  quote_sent?: boolean;
  quote_notes?: string;
  attachment_url?: string;
  attachment_name?: string;
  follow_up_date?: string;
};

const API_URL = "/api/admin/rfq";

const statusOptions = ["new", "sourcing", "quoted", "won", "lost"];
const priorityOptions = ["low", "normal", "high", "urgent"];
const quoteStatusOptions = ["Draft", "Waiting Supplier Price", "Ready", "Sent"];

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function Logo() {
  return (
    <div className="px-6 py-6 border-b border-blue-900">
      <div className="text-3xl font-black tracking-tight text-white leading-none">
        GL<span className="inline-block">🌐</span>BAL
      </div>
      <div className="text-sm font-bold text-white tracking-widest mt-1">
        PLC PARTS
      </div>
      <div className="w-28 h-1 bg-red-500 mt-3 rounded-full" />
    </div>
  );
}

export default function RFQAdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = useMemo(
    () => rfqs.find((r) => r.id === selectedId) || rfqs[0],
    [rfqs, selectedId]
  );

  async function loadRFQs() {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        headers: {
          "x-admin-password": password,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Load RFQ failed");
        return;
      }

      const list = Array.isArray(data) ? data : data.data || data.rfqs || [];
      setRfqs(list);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
      }
      setAuthed(true);
    } catch {
      alert("Load RFQ failed");
    } finally {
      setLoading(false);
    }
  }

  async function updateRFQ(id: string, patch: Partial<RFQ>) {
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ id, ...patch }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Update failed");
        return;
      }

      setRfqs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
      );
    } catch {
      alert("Update failed");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    const rows = rfqs.map((r) => ({
      Date: formatDate(r.created_at),
      Company: r.company_name || "",
      Contact: r.contact_name || "",
      Email: r.email || "",
      Phone: r.phone || "",
      Country: r.country || "",
      Brand: r.brand || "",
      Part: r.part_number || "",
      Qty: r.quantity || "",
      Status: r.status || "",
      Priority: r.priority || "",
      Pipeline: r.pipeline_status || "",
      EstimatedValue: r.estimated_value || "",
      FollowUpDate: r.follow_up_date || "",
    }));

    const csv =
      Object.keys(rows[0] || {}).join(",") +
      "\n" +
      rows
        .map((row) =>
          Object.values(row)
            .map((v) => `"${String(v).replaceAll('"', '""')}"`)
            .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "globalplcparts-rfq.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!authed) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border p-8">
          <div className="mb-8">
            <div className="text-4xl font-black text-blue-900">
              GL🌐BAL
            </div>
            <div className="font-bold tracking-widest text-slate-700">
              PLC PARTS RFQ CRM
            </div>
          </div>

          <h1 className="text-2xl font-black mb-2">Admin Login</h1>
          <p className="text-slate-500 mb-6">
            Enter admin password to manage RFQ requests.
          </p>

          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 mb-4"
          />

          <button
            onClick={loadRFQs}
            disabled={loading || !password}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-black disabled:bg-slate-400"
          >
            {loading ? "Loading..." : "Login"}
          </button>
        </div>
      </main>
    );
  }

 // 生成单个 PDF
function generateSinglePDF(rfq: RFQ | null) {
  if (!rfq) return;

  const pdf = new jsPDF();

  pdf.setFontSize(18);
  pdf.text("GlobalPLCParts RFQ", 20, 20);

  pdf.setFontSize(12);
  pdf.text(`Company: ${rfq.company_name || ""}`, 20, 40);
  pdf.text(`Contact: ${rfq.contact_name || ""}`, 20, 50);
  pdf.text(`Email: ${rfq.email || ""}`, 20, 60);
  pdf.text(`Part Number: ${rfq.part_number || ""}`, 20, 70);
  pdf.text(`Brand: ${rfq.brand || ""}`, 20, 80);
  pdf.text(`Quantity: ${rfq.quantity || ""}`, 20, 90);

  pdf.text(`RFQ Details: ${rfq.rfq_details || ""}`, 20, 110);

  pdf.save(`RFQ-${rfq.id}.pdf`);
}

// 批量生成 PDF
function generateBatchPDF() {
  if (!rfqs?.length) {
    alert("No RFQ data to export.");
    return;
  }

  const pdf = new jsPDF();

  rfqs.forEach((r, index) => {
    if (index > 0) pdf.addPage();

    pdf.setFontSize(18);
    pdf.text("GlobalPLCParts RFQ", 20, 20);

    pdf.setFontSize(12);
    pdf.text(`Company: ${r.company_name || ""}`, 20, 40);
    pdf.text(`Contact: ${r.contact_name || ""}`, 20, 50);
    pdf.text(`Email: ${r.email || ""}`, 20, 60);
    pdf.text(`Part Number: ${r.part_number || ""}`, 20, 70);
    pdf.text(`Brand: ${r.brand || ""}`, 20, 80);
    pdf.text(`Quantity: ${r.quantity || ""}`, 20, 90);
    pdf.text(`RFQ Details: ${r.rfq_details || ""}`, 20, 110);
  });

  pdf.save(`RFQs-Batch.pdf`);
}

// 批量导出 Excel
function exportBatchExcel() {
  if (!rfqs || rfqs.length === 0) return;

  const wsData = rfqs.map((r) => ({
    Created: r.created_at || "",
    Company: r.company_name || "",
    Contact: r.contact_name || "",
    Email: r.email || "",
    Phone: r.phone || "",
    Country: r.country || "",
    Brand: r.brand || "",
    "Part Num": r.part_number || "",
    Quantity: r.quantity || "",
    Condition: r.condition_required || "",
    Status: r.status || "",
    Priority: r.priority || "",
    Pipeline: r.pipeline_status || "",
    "Quote Status": r.quote_status || "",
    "Estimated Value": r.estimated_value || "",
    "Follow-up": r.follow_up_date || "",
    "RFQ Details": r.rfq_details || "",
    "Internal Notes": r.internal_notes || "",
    "Quote Notes": r.quote_notes || "",
  }));

  const ws = XLSX.utils.json_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "RFQs");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `GlobalPLCParts-RFQs-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
function sendBatchEmails() {
  alert("Batch Email will be added in the next step.");
}

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-64 bg-gradient-to-b from-blue-950 to-slate-950 text-white hidden lg:flex flex-col">
          <Logo />

          <nav className="p-4 space-y-2 text-sm font-bold">
            <div className="px-4 py-3 rounded-xl bg-blue-600">📥 RFQ Management</div>
            <div className="px-4 py-3 rounded-xl hover:bg-white/10">📊 Dashboard</div>
            <div className="px-4 py-3 rounded-xl hover:bg-white/10">🧾 Quotes</div>
            <div className="px-4 py-3 rounded-xl hover:bg-white/10">👥 Customers</div>
            <div className="px-4 py-3 rounded-xl hover:bg-white/10">📦 Products</div>
            <div className="px-4 py-3 rounded-xl hover:bg-white/10">⏰ Follow-up</div>
            <div className="px-4 py-3 rounded-xl hover:bg-white/10">⚙️ Settings</div>
          </nav>

          <div className="mt-auto p-5 border-t border-white/10 text-xs text-slate-300">
            <div className="font-black text-white">Global PLC Parts</div>
            <div>sales@globalplcparts.com</div>
          </div>
        </aside>

        <section className="flex-1 p-4 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-black">RFQ CRM PRO MAX v5</h1>
              <p className="text-slate-500">
                Sales pipeline, quote draft, attachments and follow-up.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={loadRFQs}
                className="px-4 py-2 rounded-xl border bg-white font-black"
              >
                Refresh
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-xl bg-green-600 text-white font-black"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-3 bg-white rounded-3xl border shadow-sm overflow-hidden">
              <div className="p-5 border-b">
                <h2 className="font-black text-lg">RFQ List</h2>
                <p className="text-sm text-slate-500">{rfqs.length} requests</p>
              </div>

              <div className="max-h-[760px] overflow-auto">
                {rfqs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-4 border-b hover:bg-blue-50 ${
                      selected?.id === r.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <div className="font-black truncate">
                        {r.company_name || "Unknown Company"}
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                        {r.status || "new"}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 truncate mt-1">
                      {r.part_number || "-"} · {r.brand || "-"}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatDate(r.created_at)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="xl:col-span-9">
              {!selected ? (
                <div className="bg-white rounded-3xl border p-10 text-center">
                  No RFQ found.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white rounded-3xl border shadow-sm p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-500">RFQ Detail</div>
                        <h2 className="text-3xl font-black">
                          #{selected.id.slice(0, 8)}
                        </h2>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <select
                          value={selected.status || "new"}
                          onChange={(e) =>
                            updateRFQ(selected.id, {
                              status: e.target.value,
                              pipeline_status: e.target.value,
                            })
                          }
                          className="border rounded-xl px-4 py-2 bg-white font-bold"
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        <button className="bg-blue-600 text-white px-5 py-2 rounded-xl font-black">
                          Generate Quote
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-8 space-y-6">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-2xl border p-5">
                          <div className="text-sm text-slate-500">Part Number</div>
                          <div className="font-black mt-1 break-all">
                            {selected.part_number || "-"}
                          </div>
                        </div>
                        <div className="bg-white rounded-2xl border p-5">
                          <div className="text-sm text-slate-500">Brand</div>
                          <div className="font-black mt-1">{selected.brand || "-"}</div>
                        </div>
                        <div className="bg-white rounded-2xl border p-5">
                          <div className="text-sm text-slate-500">Quantity</div>
                          <div className="font-black mt-1">{selected.quantity || "-"}</div>
                        </div>
                        <div className="bg-white rounded-2xl border p-5">
                          <div className="text-sm text-slate-500">Received</div>
                          <div className="font-black mt-1 text-sm">
                            {formatDate(selected.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border shadow-sm p-6">
                        <h3 className="font-black text-xl mb-4">RFQ Details</h3>
                        <div className="rounded-2xl bg-slate-50 border p-5 whitespace-pre-wrap min-h-32">
                          {selected.rfq_details || "No RFQ details."}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border shadow-sm p-6">
                        <h3 className="font-black text-xl mb-4">RFQ Workflow</h3>
                        <div className="grid grid-cols-5 gap-3">
                          {["New", "Sourcing", "Quoted", "Won", "Lost"].map((step) => {
                            const active =
                              (selected.status || "new").toLowerCase() ===
                              step.toLowerCase();

                            return (
                              <div
                                key={step}
                                className={`rounded-2xl border p-4 text-center ${
                                  active
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-slate-50"
                                }`}
                              >
                                <div className="text-2xl mb-1">
                                  {step === "New"
                                    ? "📥"
                                    : step === "Sourcing"
                                    ? "🔍"
                                    : step === "Quoted"
                                    ? "🧾"
                                    : step === "Won"
                                    ? "✅"
                                    : "❌"}
                                </div>
                                <div className="font-black text-sm">{step}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border shadow-sm p-6">
  <h3 className="font-black text-xl mb-4">Quick Actions</h3>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    
    {/* 单个 PDF */}
    <button
      onClick={() => generateSinglePDF(selected)}
      className="rounded-2xl border p-4 text-left hover:bg-blue-50"
    >
      <div className="text-2xl">📄</div>
      <div className="font-black mt-2">Single PDF</div>
      <div className="text-xs text-slate-500">Current RFQ</div>
    </button>

    {/* 批量 PDF */}
    <button
      onClick={generateBatchPDF}
      className="rounded-2xl border p-4 text-left hover:bg-green-50"
    >
      <div className="text-2xl">📄</div>
      <div className="font-black mt-2">Batch PDF</div>
      <div className="text-xs text-slate-500">All RFQs</div>
    </button>

    {/* 批量邮件 */}
    <button
      onClick={sendBatchEmails}
      className="rounded-2xl border p-4 text-left hover:bg-orange-50"
    >
      <div className="text-2xl">📧</div>
      <div className="font-black mt-2">Batch Email</div>
      <div className="text-xs text-slate-500">Coming next</div>
    </button>

    {/* 批量 Excel */}
    <button
      onClick={exportBatchExcel}
      className="rounded-2xl border p-4 text-left hover:bg-purple-50"
    >
      <div className="text-2xl">📊</div>
      <div className="font-black mt-2">Export Excel</div>
      <div className="text-xs text-slate-500">Download all RFQs</div>
    </button>

    {/* 刷新数据 */}
    <button
      onClick={loadRFQs}
      className="rounded-2xl border p-4 text-left hover:bg-slate-50"
    >
      <div className="text-2xl">🔄</div>
      <div className="font-black mt-2">Refresh</div>
      <div className="text-xs text-slate-500">Reload data</div>
    </button>

  </div>
</div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-yellow-50 rounded-3xl border border-yellow-200 p-6">
                          <h3 className="font-black mb-3">Internal Notes</h3>
                          <textarea
                            defaultValue={selected.internal_notes || ""}
                            placeholder="Private CRM notes..."
                            className="w-full h-32 border rounded-2xl p-4"
                            onBlur={(e) =>
                              updateRFQ(selected.id, {
                                internal_notes: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div className="bg-blue-50 rounded-3xl border border-blue-200 p-6">
                          <h3 className="font-black mb-3">Quote Notes</h3>
                          <textarea
                            defaultValue={selected.quote_notes || ""}
                            placeholder="Quotation notes for customer email..."
                            className="w-full h-32 border rounded-2xl p-4"
                            onBlur={(e) =>
                              updateRFQ(selected.id, {
                                quote_notes: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white rounded-3xl border shadow-sm p-6">
                        <h3 className="font-black text-xl mb-5">
                          Customer & RFQ Details
                        </h3>

                        <div className="grid grid-cols-2 gap-5 text-sm">
                          <Info label="Company" value={selected.company_name} />
                          <Info label="Priority" value={selected.priority || "normal"} />
                          <Info label="Contact" value={selected.contact_name} />
                          <Info label="Target Price" value={String(selected.estimated_value || "-")} />
                          <Info label="Email" value={selected.email} />
                          <Info label="Lead Time" value={selected.target_delivery_date} />
                          <Info label="Phone" value={selected.phone} />
                          <Info label="Condition" value={selected.condition_required} />
                          <Info label="Country" value={selected.country} />
                          <Info label="Created" value={formatDate(selected.created_at)} />
                        </div>

                        <div className="mt-5">
                          <label className="text-xs font-black text-slate-500">
                            Priority
                          </label>
                          <select
                            value={selected.priority || "normal"}
                            onChange={(e) =>
                              updateRFQ(selected.id, { priority: e.target.value })
                            }
                            className="w-full mt-1 border rounded-xl px-3 py-2"
                          >
                            {priorityOptions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-4">
                          <label className="text-xs font-black text-slate-500">
                            Quote Status
                          </label>
                          <select
                            value={selected.quote_status || "Draft"}
                            onChange={(e) =>
                              updateRFQ(selected.id, {
                                quote_status: e.target.value,
                              })
                            }
                            className="w-full mt-1 border rounded-xl px-3 py-2"
                          >
                            {quoteStatusOptions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-4">
                          <label className="text-xs font-black text-slate-500">
                            Follow-up Date
                          </label>
                          <input
                            type="date"
                            defaultValue={selected.follow_up_date || ""}
                            onBlur={(e) =>
                              updateRFQ(selected.id, {
                                follow_up_date: e.target.value,
                              })
                            }
                            className="w-full mt-1 border rounded-xl px-3 py-2"
                          />
                        </div>
                      </div>

                      <div className="bg-white rounded-3xl border shadow-sm p-6">
                        <h3 className="font-black text-xl mb-4">Attachments</h3>

                        {selected.attachment_url ? (
                          <a
                            href={selected.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-black"
                          >
                            📎 {selected.attachment_name || "Download Attachment"}
                          </a>
                        ) : (
                          <div className="text-sm text-slate-500">
                            No attachment uploaded.
                          </div>
                        )}
                      </div>

                      <div className="bg-white rounded-3xl border shadow-sm p-6">
                        <h3 className="font-black text-xl mb-4">Timeline</h3>

                        <div className="space-y-5">
                          <Timeline
                            title="RFQ Created"
                            desc="Website RFQ submission"
                            time={formatDate(selected.created_at)}
                          />
                          <Timeline
                            title={`Status: ${selected.status || "new"}`}
                            desc="Current pipeline status"
                            time={formatDate(selected.created_at)}
                          />
                          {selected.follow_up_date && (
                            <Timeline
                              title="Follow-up Reminder"
                              desc={selected.follow_up_date}
                              time="Scheduled"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {saving && (
  <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl font-black">
    Saving...
  </div>
)}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500 font-bold">{label}</div>
      <div className="font-black break-all">{value || "-"}</div>
    </div>
  );
}

function Timeline({
  title,
  desc,
  time,
}: {
  title: string;
  desc: string;
  time: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-3 h-3 rounded-full bg-blue-600 mt-1.5" />
      <div className="flex-1">
        <div className="font-black">{title}</div>
        <div className="text-sm text-slate-500">{desc}</div>
        <div className="text-xs text-slate-400 mt-1">{time}</div>
      </div>
    </div>
  );
}
