import Link from "next/link";
import { products } from "@/data/products";
import ProductImage from "@/components/ProductImage";

export const metadata = {
  title: "Search Industrial Automation Parts | GlobalPLCParts",
  description:
    "Search PLC, DCS, HMI, controller, module and industrial automation spare parts by model number, brand or category.",
};

const PAGE_SIZE = 24;
const whatsappNumber = "13774696836";
const whatsappLink = `https://wa.me/${whatsappNumber}`;

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: number[] = [];
  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    pages.push(i);
  }
  return pages;
}

function pageHref(q: string, page: number) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (page > 1) params.set("page", String(page));
  return `/search?${params.toString()}`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;

  const keyword = q.trim().toLowerCase();
  const currentPage = Math.max(1, Number(page) || 1);

  const allResults = keyword
    ? products.filter((product) => {
        const text = [
          product.brand,
          product.model,
          product.category,
          product.description,
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(keyword);
      })
    : products;

  const totalPages = Math.max(1, Math.ceil(allResults.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const results = allResults.slice(start, start + PAGE_SIZE);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Search</span>
        </div>
      </section>

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <p className="text-blue-600 font-black mb-4">
            Industrial Parts Search
          </p>

          <h1 className="text-5xl font-black leading-tight mb-5">
            Search PLC, DCS, HMI & Automation Parts
          </h1>

          <p className="text-slate-600 leading-7 max-w-3xl">
            Search by model number, brand, category or product description.
            Submit RFQ for price, availability and lead time.
          </p>

          <form action="/search" className="mt-8 flex flex-col md:flex-row gap-4">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search model number, brand, category..."
              className="flex-1 border rounded-2xl px-5 py-4 outline-none focus:border-blue-600"
            />

            <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-4xl font-black mb-3">
              {keyword ? `Search results for "${q}"` : "Popular Products"}
            </h2>

            <p className="text-slate-600">
              Showing page {safePage} of {totalPages} · {allResults.length} matching products.
            </p>
          </div>

          <Link
            href="/request-quote"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black"
          >
            Send RFQ
          </Link>
        </div>

        {allResults.length === 0 ? (
          <div className="bg-white border rounded-3xl p-10">
            <h3 className="text-3xl font-black mb-4">No products found</h3>

            <p className="text-slate-600 leading-7 mb-6">
              We may still be able to source this model. Please send the part
              number to request quotation.
            </p>

            <Link
              href={`/request-quote?model=${encodeURIComponent(q)}`}
              className="inline-block bg-green-500 text-white px-8 py-4 rounded-xl font-black"
            >
              Request This Model
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {results.map((product, index) => (
                <Link
                  key={`${product.slug}-${safePage}-${index}`}
                  href={`/products/${product.slug}`}
                  className="bg-white border rounded-3xl overflow-hidden hover:shadow-lg transition"
                >
                  <div className="h-48 bg-slate-100 border-b flex items-center justify-center">
                    <ProductImage
                      src={product.image}
                      brand={product.brand}
                      model={product.model}
                      className="w-full h-full object-contain p-5"
                    />
                  </div>

                  <div className="p-6">
                    <p className="text-blue-600 font-black text-sm mb-2">
                      {product.brand}
                    </p>

                    <h3 className="text-xl font-black mb-3 line-clamp-2">
                      {product.model}
                    </h3>

                    <p className="text-slate-500 text-sm mb-5">
                      {product.category}
                    </p>

                    <span className="inline-block bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm">
                      View Details
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-2">
              <Link
                href={pageHref(q, 1)}
                className={`px-4 py-2 border rounded-lg bg-white ${
                  safePage === 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                First
              </Link>

              <Link
                href={pageHref(q, safePage - 1)}
                className={`px-4 py-2 border rounded-lg bg-white ${
                  safePage === 1 ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Prev
              </Link>

              {getPageNumbers(safePage, totalPages).map((p) => (
                <Link
                  key={p}
                  href={pageHref(q, p)}
                  className={`px-4 py-2 border rounded-lg font-bold ${
                    p === safePage
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white"
                  }`}
                >
                  {p}
                </Link>
              ))}

              <Link
                href={pageHref(q, safePage + 1)}
                className={`px-4 py-2 border rounded-lg bg-white ${
                  safePage === totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Next
              </Link>

              <Link
                href={pageHref(q, totalPages)}
                className={`px-4 py-2 border rounded-lg bg-white ${
                  safePage === totalPages ? "pointer-events-none opacity-40" : ""
                }`}
              >
                Last
              </Link>
            </div>
          </>
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