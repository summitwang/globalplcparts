import Link from "next/link";
import { products } from "@/data/products";
import ProductImage from "@/components/ProductImage";

export const metadata = {
  title: "Search Industrial Automation Parts | GlobalPLCParts",
  description:
    "Search PLC, DCS, HMI, controller, module and industrial automation spare parts by model number, brand or category.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;

  const keyword = q.trim().toLowerCase();

  const results = keyword
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
    : products.slice(0, 24);

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
              Showing {results.length} matching products.
            </p>
          </div>

          <Link
            href="/request-quote"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black"
          >
            Send RFQ
          </Link>
        </div>

        {results.length === 0 ? (
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {results.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="bg-white border rounded-3xl overflow-hidden hover:shadow-lg transition"
              >
                <div className="h-48 bg-slate-100 border-b flex items-center justify-center">
                  {product.image ? (
                    <ProductImage
    src={product.image}
    brand={product.brand}
    model={product.model}
                      className="w-full h-full object-contain p-5"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl font-black text-blue-600">
                        PLC
                      </div>
                      <p className="text-slate-400 text-sm mt-2">
                        Product Image
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <p className="text-blue-600 font-black text-sm mb-2">
                    {product.brand}
                  </p>

                  <h3 className="text-xl font-black mb-3">
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
        )}
      </section>
    </main>
  );
}