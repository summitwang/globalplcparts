"use client";

import { useEffect, useState } from "react";

export default function ProductScraperPage() {
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  async function loadStats() {
    const res = await fetch("/api/admin/scraper/start");
    const data = await res.json();
    setStats(data);
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleImport() {
    if (!password || !file) {
      alert("Please enter password and upload Excel / CSV file.");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("password", password);
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/scraper/start", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
      await loadStats();
    } catch (err: any) {
      setResult({
        error: err.message || "Import failed",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <section className="bg-white border rounded-3xl p-8 shadow-sm">
          <h1 className="text-3xl font-black mb-2">
            Product Scraper PRO MAX v4.1
          </h1>

          <p className="text-slate-600 mb-8">
            Excel Upload + CSV Import + Import History.
          </p>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="border rounded-2xl p-5">
                <div className="text-sm text-slate-500">Total Products</div>
                <div className="text-3xl font-black">{stats.totalProducts}</div>
              </div>

              <div className="border rounded-2xl p-5">
                <div className="text-sm text-slate-500">Total Brands</div>
                <div className="text-3xl font-black">{stats.totalBrands}</div>
              </div>

              <div className="border rounded-2xl p-5">
                <div className="text-sm text-slate-500">Missing Images</div>
                <div className="text-3xl font-black text-orange-600">
                  {stats.missingImages}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="block font-black mb-2">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </div>

            <div>
              <label className="block font-black mb-2">
                Upload Excel / CSV
              </label>

              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full border rounded-xl px-4 py-3 bg-white"
              />

              <div className="mt-3 text-sm text-slate-500">
                Supported columns: brand, model, category, description, image, sourceUrl
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black disabled:bg-slate-400"
            >
              {loading ? "Importing..." : "Import Products"}
            </button>
          </div>

          {result && (
            <div className="mt-8 bg-slate-100 rounded-2xl p-6">
              <h2 className="text-xl font-black mb-4">Import Result</h2>

              <p>Found: {result.found || 0}</p>
              <p>Imported: {result.imported || 0}</p>
              <p>Updated: {result.updated || 0}</p>
              <p>Total Products: {result.totalProducts || 0}</p>

              {result.jobId && (
                <p className="break-all">Job ID: {result.jobId}</p>
              )}

              {result.error && (
                <p className="text-red-600 mt-3 break-all">
                  Error: {result.error}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="bg-white border rounded-3xl p-8 shadow-sm">
          <h2 className="text-2xl font-black mb-5">Import History</h2>

          {!stats?.importHistory?.length && (
            <p className="text-slate-500">No import history yet.</p>
          )}

          <div className="space-y-3">
            {stats?.importHistory?.map((item: any) => (
              <div
                key={item.id}
                className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="font-black">{item.fileName}</div>
                  <div className="text-sm text-slate-500">
                    {new Date(item.date).toLocaleString()}
                  </div>
                </div>

                <div className="text-sm">
                  Found: <b>{item.found}</b> · Imported:{" "}
                  <b className="text-green-600">{item.imported}</b> · Updated:{" "}
                  <b className="text-blue-600">{item.updated}</b>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}