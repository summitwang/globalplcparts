import Link from "next/link";
import { products } from "@/data/products";
import ProductImage from "@/components/ProductImage";

const whatsappNumber = "13774696836";

export const metadata = {
  title: "GlobalPLCParts | Industrial Automation Parts Supplier",
  description:
    "Search PLC, DCS, HMI, controllers, modules and industrial automation spare parts. Fast RFQ support worldwide.",
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
    .slice(0, 10);

  const popularModels = products.slice(0, 12);

  const whatsappText = encodeURIComponent(
    "Hello GlobalPLCParts, I want to request a quotation for industrial automation spare parts."
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_35%),linear-gradient(135deg,#020617,#0f172a)]" />

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-14 items-center">
          <div className="lg:col-span-7">
            <p className="text-blue-300 font-black mb-5 tracking-wide">
              WORLDWIDE INDUSTRIAL AUTOMATION PARTS SUPPLIER
            </p>

            <h1 className="text-5xl lg:text-7xl font-black leading-tight mb-6">
              PLC, DCS, HMI & Control System Spare Parts
            </h1>

            <p className="text-xl text-slate-300 leading-8 max-w-3xl mb-8">
              GlobalPLCParts helps industrial buyers source automation spare
              parts, obsolete modules, controllers, I/O cards, drives and HMI
              panels with fast RFQ support.
            </p>

            <form
              action="/search"
              className="bg-white rounded-2xl p-3 flex flex-col md:flex-row gap-3 mb-8 shadow-2xl"
            >
              <input
                name="q"
                placeholder="Search part number: 1756-L71, 6ES7315, IC693CPU..."
                className="flex-1 text-slate-900 border rounded-xl px-5 py-4 outline-none focus:border-blue-600"
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
                className="bg-white text-slate-900 px-8 py-4 rounded-xl font-black"
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
              <Stat value="24H" label="RFQ Response" />
              <Stat value={`${products.length}+`} label="Product Models" />
              <Stat value="17+" label="Major Brands" />
              <Stat value="Global" label="Shipping Support" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-4xl font-black mb-6">
                Send Model Number, Get Fast Quote
              </h2>

              <div className="space-y-4 mb-8">
                <HeroCard
                  title="1. Send Exact Part Number"
                  text="Provide model number, brand, quantity and destination country."
                />
                <HeroCard
                  title="2. Check Stock & Lead Time"
                  text="We check availability, condition, price and shipping options."
                />
                <HeroCard
                  title="3. Worldwide Supply"
                  text="Support factory maintenance, process control and automation projects."
                />
              </div>

              <Link
                href="/request-quote"
                className="block bg-green-500 hover:bg-green-600 text-center py-4 rounded-xl font-black"
              >
                Submit RFQ Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-5">
          <CategoryCard title="PLC Modules" text="CPUs, I/O modules, racks, power supplies and communication cards." />
          <CategoryCard title="DCS Parts" text="Honeywell, Emerson, Yokogawa, Foxboro and process control parts." />
          <CategoryCard title="HMI & Drives" text="Panels, industrial PCs, servo drives, VFDs and controller parts." />
          <CategoryCard title="Obsolete Parts" text="Hard-to-find and discontinued automation spare parts sourcing." />
        </div>
      </section>

      <section className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <SectionHead
            label="Quick Model Search"
            title="Popular Industrial Part Numbers"
            href="/search"
            linkText="Search All Parts →"
          />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularModels.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="bg-slate-50 border rounded-2xl p-5 hover:border-blue-600 hover:bg-blue-50 transition"
              >
                <p className="text-blue-600 font-black text-sm mb-2">
                  {product.brand}
                </p>
                <h3 className="text-xl font-black mb-2">{product.model}</h3>
                <p className="text-slate-500 text-sm">{product.category}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          label="Multi-brand Supply"
          title="Popular Industrial Brands"
          href="/brands"
          linkText="View All Brands →"
        />

        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="bg-white border rounded-2xl p-5 hover:shadow-md hover:border-blue-600 transition"
            >
              <h3 className="text-xl font-black mb-2">{brand.name}</h3>
              <p className="text-slate-500 text-sm">{brand.count} products</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-green-400 font-black mb-3">
              Industrial Sourcing Support
            </p>
            <h2 className="text-5xl font-black leading-tight mb-6">
              Hard-to-find automation parts for maintenance teams.
            </h2>

            <p className="text-slate-300 leading-8 mb-8">
              We support factories, maintenance companies, automation engineers
              and industrial buyers looking for replacement PLC, DCS, HMI,
              controller and module parts.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <DarkPoint text="New / used / refurbished options" />
              <DarkPoint text="Obsolete and discontinued parts" />
              <DarkPoint text="Fast quotation response" />
              <DarkPoint text="Worldwide shipping support" />
            </div>
          </div>

          <div className="bg-white text-slate-900 rounded-3xl p-8">
            <h3 className="text-3xl font-black mb-4">
              Request Price & Availability
            </h3>

            <p className="text-slate-600 leading-7 mb-6">
              Send the exact part number and quantity. We will help check stock,
              price, lead time and delivery options.
            </p>

            <Link
              href="/request-quote"
              className="block bg-green-500 hover:bg-green-600 text-white text-center py-4 rounded-xl font-black"
            >
              Send RFQ
            </Link>
          </div>
        </div>
      </section>

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
      </section>

      <section className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-4xl font-black mb-6">
            Industrial Automation Spare Parts Supplier
          </h2>

          <div className="grid lg:grid-cols-2 gap-8 text-slate-700 leading-8">
            <p>
              GlobalPLCParts supplies PLC modules, DCS modules, HMI panels,
              controllers, servo drives, sensors, I/O modules and industrial
              automation replacement parts for manufacturing plants, utilities,
              oil and gas, water treatment, power generation and process control
              projects.
            </p>

            <p>
              Search by model number, browse by brand, or submit a quotation
              request. Our team supports industrial buyers looking for fast price
              checking, availability confirmation and global delivery options.
            </p>
          </div>
        </div>
      </section>

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
    <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-slate-300 mt-1">{label}</p>
    </div>
  );
}

function HeroCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
      <h3 className="font-black mb-2">{title}</h3>
      <p className="text-slate-300">{text}</p>
    </div>
  );
}

function CategoryCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition">
      <h3 className="text-xl font-black mb-3">{title}</h3>
      <p className="text-slate-600 leading-7">{text}</p>
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

      <Link href={href} className="text-blue-600 font-black">
        {linkText}
      </Link>
    </div>
  );
}