import Link from "next/link";
import Image from "next/image";
import { products } from "@/data/products";
import ProductImage from "@/components/ProductImage";

const whatsappNumber = "13774696836";

export const metadata = {
  title: "GlobalPLCParts | PLC, DCS, HMI & Industrial Automation Parts Supplier",
  description:
    "GlobalPLCParts supplies PLC, DCS, HMI, drives, controllers and industrial automation spare parts worldwide. Search part numbers and request fast RFQ.",
};

export default function HomePage() {
  const featuredProducts = products.slice(0, 8);

  const brands = Array.from(
    new Map(
      products.map((item) => [
        item.brandSlug,
        {
          name: item.brand,
          slug: item.brandSlug,
          count: products.filter((p) => p.brandSlug === item.brandSlug).length,
        },
      ])
    ).values()
  )
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const popularModels = products.slice(0, 12);

  const whatsappText = encodeURIComponent(
    "Hello GlobalPLCParts, I want to request a quotation for industrial automation spare parts."
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-14 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-blue-700 font-black tracking-wide mb-4">
              WORLDWIDE INDUSTRIAL AUTOMATION PARTS SUPPLIER
            </p>

            <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-6 text-slate-950">
              PLC, DCS, HMI & Automation Spare Parts
            </h1>

            <p className="text-lg text-slate-600 leading-8 mb-8 max-w-2xl">
              Search industrial automation part numbers, compare brands and
              request fast quotation for PLC modules, DCS cards, HMI panels,
              drives, controllers and hard-to-find spare parts.
            </p>

            <form
              action="/search"
              className="bg-white border-2 border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row gap-3 shadow-lg mb-7"
            >
              <input
                name="q"
                placeholder="Search part number: 1756-L71, 6ES7315, IC693CPU..."
                className="flex-1 border rounded-xl px-5 py-4 outline-none focus:border-blue-600"
              />

              <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black">
                Search Parts
              </button>
            </form>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link
                href="/products"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black"
              >
                Browse Products
              </Link>

              <Link
                href="/request-quote"
                className="bg-slate-950 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-black"
              >
                Request Quote
              </Link>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl font-black"
              >
                WhatsApp RFQ
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat value="24H" label="RFQ Reply" />
              <Stat value={`${products.length}+`} label="Models" />
              <Stat value="17+" label="Brands" />
              <Stat value="Global" label="Supply" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-blue-100 rounded-[2rem] rotate-2" />
            <Image
              src="/brand/hero-industrial-banner.webp"
              alt="GlobalPLCParts industrial automation parts"
              width={1200}
              height={630}
              priority
              className="relative rounded-[2rem] shadow-2xl border object-cover"
            />
          </div>
        </div>
      </section>

      {/* CATEGORY NAV */}
      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CategoryCard title="PLC Modules" text="CPU, I/O, racks, power supplies and communication modules." />
          <CategoryCard title="DCS Systems" text="Honeywell, Emerson, Yokogawa, Foxboro and process control parts." />
          <CategoryCard title="HMI & Drives" text="Panels, industrial PCs, servo drives, VFDs and controllers." />
          <CategoryCard title="Obsolete Parts" text="Discontinued and hard-to-find automation spare parts." />
        </div>
      </section>

      {/* POPULAR MODELS */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          label="Quick Model Search"
          title="Popular Industrial Part Numbers"
          href="/products"
          linkText="View All Products →"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {popularModels.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="bg-white border rounded-2xl p-5 hover:border-blue-600 hover:shadow-md transition"
            >
              <p className="text-blue-600 font-black text-sm mb-2">
                {product.brand}
              </p>
              <h3 className="text-xl font-black mb-2">{product.model}</h3>
              <p className="text-slate-500 text-sm">{product.category}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* BRANDS */}
      <section className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <SectionHead
            label="Authorized-style Multi-brand Sourcing"
            title="Browse by Manufacturer"
            href="/brands"
            linkText="View All Brands →"
          />

          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.slug}
                href={`/brands/${brand.slug}`}
                className="border rounded-2xl p-5 hover:border-blue-600 hover:bg-blue-50 transition"
              >
                <h3 className="font-black text-lg mb-2">{brand.name}</h3>
                <p className="text-slate-500 text-sm">{brand.count} products</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* RFQ CTA */}
      <section className="bg-gradient-to-r from-slate-950 to-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-green-400 font-black mb-3">
              FAST INDUSTRIAL RFQ SUPPORT
            </p>

            <h2 className="text-5xl font-black leading-tight mb-6">
              Can’t find the exact part number?
            </h2>

            <p className="text-slate-300 leading-8 mb-8">
              Send us the model number, brand, quantity and destination country.
              We will help check price, stock availability, lead time and supply
              options.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <DarkPoint text="PLC / DCS / HMI / Drive parts" />
              <DarkPoint text="Obsolete module sourcing" />
              <DarkPoint text="Fast quotation response" />
              <DarkPoint text="Worldwide shipping support" />
            </div>
          </div>

          <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-3xl font-black mb-4">
              Request Price & Availability
            </h3>

            <p className="text-slate-600 leading-7 mb-6">
              For urgent maintenance or spare parts replacement, submit an RFQ
              and our team will respond as soon as possible.
            </p>

            <Link
              href="/request-quote"
              className="block bg-green-500 hover:bg-green-600 text-white text-center py-4 rounded-xl font-black"
            >
              Submit RFQ Now
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          label="Featured Products"
          title="Industrial Automation Spare Parts"
          href="/products"
          linkText="View Products →"
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="bg-white border rounded-3xl overflow-hidden hover:shadow-xl hover:border-blue-600 transition"
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
      </section>

      {/* SEO CONTENT */}
      <section className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-4xl font-black mb-6">
            Global Industrial Automation Spare Parts Supplier
          </h2>

          <div className="grid lg:grid-cols-2 gap-8 text-slate-700 leading-8">
            <p>
              GlobalPLCParts supplies PLC modules, DCS cards, HMI panels,
              controllers, servo drives, communication modules, I/O modules and
              industrial automation spare parts for factories, utilities, OEMs
              and maintenance teams worldwide.
            </p>

            <p>
              Browse products by manufacturer, search exact part numbers or send
              an RFQ for price and availability. We support industrial buyers
              looking for fast sourcing of automation spare parts and obsolete
              modules.
            </p>
          </div>
        </div>
      </section>

      {/* WHATSAPP FLOAT */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed right-6 bottom-6 z-50 bg-green-500 hover:bg-green-600 text-white px-6 py-4 rounded-full shadow-lg font-black"
      >
        WhatsApp
      </a>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border rounded-2xl p-5 shadow-sm">
      <p className="text-2xl font-black text-blue-700">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function CategoryCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-5 hover:bg-white/15 transition">
      <h3 className="text-xl font-black mb-2">{title}</h3>
      <p className="text-slate-300 leading-7">{text}</p>
    </div>
  );
}

function DarkPoint({ text }: { text: string }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-4 font-bold">
      ✓ {text}
    </div>
  );
}

function SectionHead({
  label,
  title,
  href,
  linkText,
}: {
  label: string;
  title: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8">
      <div>
        <p className="text-blue-600 font-black mb-3">{label}</p>
        <h2 className="text-4xl font-black">{title}</h2>
      </div>

      <Link href={href} className="text-blue-600 font-black whitespace-nowrap">
        {linkText}
      </Link>
    </div>
  );
}