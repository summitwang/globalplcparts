"use client";

import { useMemo, useState } from "react";
import { products } from "@/data/products";

const whatsappNumber = "13774696836";
const whatsappLink = `https://wa.me/${whatsappNumber}`;

const brands = ["All", ...Array.from(new Set(products.map((p) => p.brand)))];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("All");

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const keyword = search.toLowerCase();

      const matchSearch =
        product.model.toLowerCase().includes(keyword) ||
        product.brand.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword);

      const matchBrand = brand === "All" || product.brand === brand;

      return matchSearch && matchBrand;
    });
  }, [search, brand]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <a href="/" className="text-blue-600 font-bold">← Back Home</a>

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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search model, brand, category..."
              className="md:col-span-2 border rounded-xl px-4 py-4 w-full"
            />

            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
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
            Showing {filteredProducts.length} products
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
          {filteredProducts.map((product) => (
            <div
              key={product.slug}
              className="bg-white border rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden"
            >
              <div className="h-56 bg-slate-100 border-b flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={`${product.brand} ${product.model}`}
                    className="w-full h-full object-contain p-5"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-4xl font-black text-blue-600">PLC</div>
                    <div className="text-slate-400 text-sm mt-2">
                      Product Image
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <p className="text-blue-600 font-bold mb-2">
                  {product.brand}
                </p>

                <h2 className="text-xl font-black mb-4">
                  {product.model}
                </h2>

                <p className="text-sm text-slate-500 mb-4">
                  {product.category}
                </p>

                <p className="text-slate-600 mb-6 leading-6 min-h-[72px]">
                  {product.description}
                </p>

                <div className="flex gap-3">
                  <a
                    href={`/products/${product.slug}`}
                    className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold"
                  >
                    Details
                  </a>

                  <a
                    href={`/request-quote?model=${encodeURIComponent(
                      product.model
                    )}`}
                    className="flex-1 text-center border border-slate-300 hover:border-blue-600 py-3 rounded-xl font-bold"
                  >
                    RFQ
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

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
        className="fixed right-6 bottom-6 z-50 bg-green-500 hover:bg-green-600 text-white px-5 py-4 rounded-full shadow-lg font-bold"
      >
        WhatsApp
      </a>
    </main>
  );
}