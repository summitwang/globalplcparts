"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { products } from "@/data/products";
import ProductImage from "@/components/ProductImage";

const whatsappNumber = "13774696836";
const whatsappLink = `https://wa.me/${whatsappNumber}`;
const PAGE_SIZE = 24;

const brands = [
  "All",
  ...Array.from(new Set(products.map((p) => p.brand).filter(Boolean))),
];

function shortText(text: string | undefined, fallback: string) {
  const value = String(text || fallback);
  return value.length > 150 ? value.slice(0, 150) + "..." : value;
}

function makeSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <ProductsContent initialSearch="" initialBrand="All" initialPage={1} />
      }
    >
      <ProductsFromUrl />
    </Suspense>
  );
}

function ProductsFromUrl() {
  const params = useSearchParams();
  const urlPage = Number(params.get("page") || 1);

  return (
    <ProductsContent
      initialSearch={params.get("search") || ""}
      initialBrand={params.get("brand") || "All"}
      initialPage={urlPage > 0 ? urlPage : 1}
    />
  );
}

function ProductsContent({
  initialSearch,
  initialBrand,
  initialPage,
}: {
  initialSearch: string;
  initialBrand: string;
  initialPage: number;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [brand, setBrand] = useState(initialBrand);
  const [page, setPage] = useState(initialPage);

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase().trim();

    return products.filter((product) => {
      const matchSearch =
        !keyword ||
        String(product.model || "").toLowerCase().includes(keyword) ||
        String(product.brand || "").toLowerCase().includes(keyword) ||
        String(product.category || "").toLowerCase().includes(keyword) ||
        String(product.description || "").toLowerCase().includes(keyword);

      const matchBrand = brand === "All" || product.brand === brand;

      return matchSearch && matchBrand;
    });
  }, [search, brand]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);

  const pagedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  function updateUrl(nextPage: number, nextBrand = brand, nextSearch = search) {
    const params = new URLSearchParams();

    if (nextPage > 1) params.set("page", String(nextPage));
    if (nextBrand !== "All") params.set("brand", nextBrand);
    if (nextSearch.trim()) params.set("search", nextSearch.trim());

    const query = params.toString();
    const nextUrl = query ? `/products?${query}` : "/products";

    window.history.pushState({}, "", nextUrl);
  }

  function goToPage(nextPage: number) {
    const target = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(target);
    updateUrl(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
    updateUrl(1, brand, value);
  }

  function handleBrand(value: string) {
    setBrand(value);
    setPage(1);
    updateUrl(1, value, search);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <Link href="/" className="text-blue-600 font-bold">
            ← Back Home
          </Link>

          <h1 className="text-5xl font-black mt-6 mb-4">
            Industrial Automation Parts
          </h1>

          <p className="text-slate-600 max-w-3xl leading-7">
            Search PLC, DCS, safety system and industrial control spare parts by
            brand, model number or category.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="bg-white border rounded-3xl shadow-sm p-6 mb-10">
          <div className="grid md:grid-cols-3 gap-4">
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search model, brand, category..."
              className="md:col-span-2 border rounded-xl px-4 py-4 w-full"
            />

            <select
              value={brand}
              onChange={(e) => handleBrand(e.target.value)}
              className="border rounded-xl px-4 py-4 w-full"
            >
              {brands.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Brands" : item}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 text-slate-500 text-sm">
            Showing page {safePage} of {totalPages} · {filteredProducts.length} products found
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black">All Products</h2>

          <a
            href="/request-quote"
            className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold"
          >
            Request Quote
          </a>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {pagedProducts.map((product, index) => {
            const brandName = String(product.brand || "Industrial");
            const model = String(product.model || "Automation Part");
            const category = String(product.category || "PLC Module");
            const slug =
              product.slug ||
              makeSlug(`${brandName}-${model}-${safePage}-${index}`);

            return (
              <div
                key={`${slug}-${safePage}-${index}`}
                className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden"
              >
                <div className="h-56 bg-slate-100 border-b flex items-center justify-center">
                  <ProductImage
                    src={product.image}
                    brand={brandName}
                    model={model}
                  />
                </div>

                <div className="p-6">
                  <p className="text-blue-600 font-bold mb-2">{brandName}</p>

                  <h2 className="text-xl font-black mb-4 line-clamp-2">
                    {model}
                  </h2>

                  <p className="text-sm text-slate-500 mb-4">{category}</p>

                  <p className="text-slate-600 mb-6 leading-6 min-h-[72px]">
                    {shortText(
                      product.description,
                      `${brandName} ${model} industrial automation spare parts.`
                    )}
                  </p>

                  <div className="flex gap-3">
                    <a
                      href={`/products/${slug}`}
                      className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
                    >
                      Details
                    </a>

                    <a
                      href={`/request-quote?model=${encodeURIComponent(
                        model
                      )}&brand=${encodeURIComponent(brandName)}`}
                      className="flex-1 text-center border border-slate-300 hover:border-blue-600 py-3 rounded-xl font-bold"
                    >
                      RFQ
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length > 0 && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={safePage === 1}
              className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
            >
              First
            </button>

            <button
              onClick={() => goToPage(safePage - 1)}
              disabled={safePage === 1}
              className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
            >
              Prev
            </button>

            {getPageNumbers(safePage, totalPages).map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                className={`px-4 py-2 rounded-lg border font-bold ${
                  p === safePage
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => goToPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
            >
              Next
            </button>

            <button
              onClick={() => goToPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-4 py-2 rounded-lg border bg-white disabled:opacity-40"
            >
              Last
            </button>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="bg-white border rounded-2xl p-10 text-center mt-8">
            <h3 className="text-2xl font-black mb-3">No products found</h3>
            <p className="text-slate-500 mb-6">
              Send us your model number and we will check stock for you.
            </p>
            <a
              href="/request-quote"
              className="inline-block bg-blue-600 text-white px-6 py-4 rounded-xl font-bold"
            >
              Request Quote
            </a>
          </div>
        )}
      </section>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-6 bottom-6 z-50 bg-green-500 hover:bg-green-600 text-white px-5 py-4 rounded-full shadow-lg font-bold"
      >
        WhatsApp
      </a>
    </main>
  );
}
