import Link from "next/link";
import { products } from "@/data/products";
import ProductImage from "@/components/ProductImage";

const whatsappNumber = "13774696836";

export const metadata = {
  title: "GlobalPLCParts | PLC, DCS, HMI Industrial Automation Parts Supplier",
  description:
    "Search and request quotes for PLC, DCS, HMI, controllers, modules and industrial automation spare parts from GlobalPLCParts.",
};

export default function HomePage() {
  const featuredProducts = products.slice(0, 12);

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
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="text-blue-600 font-black mb-4">
              Global Industrial Automation Parts Supplier
            </p>

            <h1 className="text-6xl lg:text-7xl font-black leading-tight mb-6">
              Search PLC, DCS, HMI & Industrial Spare Parts
            </h1>

            <p className="text-xl text-slate-600 leading-8 max-w-3xl mb-8">
              GlobalPLCParts supplies PLC modules, DCS parts, HMI panels,
              controllers, I/O modules, drives, sensors and hard-to-find
              industrial automation spare parts worldwide.
            </p>

            <form action="/search" className="bg-slate-50 border rounded-3xl p-4 flex flex-col md:flex-row gap-3 mb-8">
              <input
                name="q"
                placeholder="Enter model number: 6ES7315, 1756-EN2T, CC-PCNT02..."
                className="flex-1 bg-white border rounded-2xl px-5 py-4 outline-none focus:border-blue-600"
              />

              <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black">
                Search Parts
              </button>
            </form>

            <div className="flex flex-wrap gap-4 mb-10">
              <Link
                href="/products"
                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-black"
              >
                Browse Products
              </Link>

              <Link
                href="/request-quote"
                className="bg-white border px-8 py-4 rounded-xl font-black"
              >
                Request a Quote
              </Link>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                className="bg-green-500 text-white px-8 py-4 rounded-xl font-black"
              >
                WhatsApp RFQ
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat value="24H" label="Fast RFQ Reply" />
              <Stat value={`${products.length}+`} label="Product Models" />
              <Stat value={`${brands.length}+`} label="Brands" />
              <Stat value="Global" label="Shipping Support" />
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl">
              <h2 className="text-4xl font-black mb-6">
                Send Model Number, Get Fast Quote
              </h2>

              <div className="space-y-4 mb-8">
                <HeroCard
                  title="1. Send Exact Part Number"
                  text="Send model number, quantity and destination country."
                />
                <HeroCard
                  title="2. Check Stock & Lead Time"
                  text="We check price, condition, availability and shipping options."
                />
                <HeroCard
                  title="3. Worldwide Delivery"
                  text="Support global factory maintenance and automation projects."
                />
              </div>

              <Link
                href="/request-quote"
                className="block bg-green-500 text-center py-4 rounded-xl font-black"
              >
                Submit RFQ Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-5">
          <CategoryCard
            title="PLC Modules"
            text="Siemens, ABB, Schneider, Omron, Mitsubishi and more."
          />
          <CategoryCard
            title="DCS Parts"
            text="Honeywell, Emerson, Yokogawa, Foxboro and process control parts."
          />
          <CategoryCard
            title="HMI & Controllers"
            text="Industrial panels, controllers, drives, CPUs and I/O modules."
          />
          <CategoryCard
            title="Obsolete Parts"
            text="Support hard-to-find and discontinued automation spare parts."
          />
        </div>
      </section>

      <section className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-blue-600 font-black mb-3">
                Quick Model Search
              </p>
              <h2 className="text-4xl font-black">
                Popular Industrial Part Numbers
              </h2>
            </div>

            <Link href="/search" className="text-blue-600 font-black">
              Search All Parts →
            </Link>
          </div>

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
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-blue-600 font-black mb-3">
              Multi-brand Supply
            </p>
            <h2 className="text-4xl font-black">
              Popular Industrial Brands
            </h2>
          </div>

          <Link href="/brands" className="text-blue-600 font-black">
            View All Brands →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="bg-white border rounded-2xl p-5 hover:shadow-md hover:border-blue-600 transition"
            >
              <h3 className="text-xl font-black mb-2">{brand.name}</h3>
              <p className="text-slate-500 text-sm">
                {brand.count} products
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 text-white">
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
              Send the exact part number and quantity. We will help check
              stock, price, lead time and delivery options.
            </p>

            <Link
              href="/request-quote"
              className="block bg-green-500 text-white text-center py-4 rounded-xl font-black"
            >
              Send RFQ
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-blue-600 font-black mb-3">
              Featured Products
            </p>
            <h2 className="text-4xl font-black">
              Industrial Automation Spare Parts
            </h2>
          </div>

          <Link href="/products" className="text-blue-600 font-black">
            View Products →
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
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

                <h3 className="text-xl font-black mb-3">{product.model}</h3>

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
              oil and gas, water treatment, power generation and process
              control projects.
            </p>

            <p>
              Search by model number, browse by brand, or submit a quotation
              request. Our team supports industrial buyers looking for fast
              price checking, availability confirmation and global delivery
              options.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-2xl font-black mb-4">
              Global<span className="text-blue-500">PLC</span>Parts
            </h3>
            <p className="text-slate-400 leading-7">
              Industrial automation spare parts supplier for PLC, DCS, HMI and
              control system replacement projects.
            </p>
          </div>

          <FooterCol
            title="Products"
            links={[
              ["All Products", "/products"],
              ["Search Parts", "/search"],
              ["Request Quote", "/request-quote"],
            ]}
          />

          <FooterCol
            title="Brands"
            links={[
              ["All Brands", "/brands"],
              ...brands.slice(0, 3).map((b) => [b.name, `/brands/${b.slug}`]),
            ]}
          />

          <div>
            <h4 className="font-black mb-4">RFQ Support</h4>
            <p className="text-slate-400 leading-7 mb-4">
              Send model number, quantity and country for fast quotation.
            </p>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
              className="inline-block bg-green-500 text-white px-5 py-3 rounded-xl font-black"
            >
              WhatsApp RFQ
            </a>
          </div>
        </div>
      </footer>

      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
        target="_blank"
        className="fixed right-6 bottom-6 z-50 bg-green-500 text-white px-6 py-4 rounded-full shadow-lg font-black"
      >
        WhatsApp
      </a>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border rounded-2xl p-5">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
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
    <div className="bg-white border rounded-3xl p-6 shadow-sm">
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

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: string[][];
}) {
  return (
    <div>
      <h4 className="font-black mb-4">{title}</h4>
      <div className="space-y-3">
        {links.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="block text-slate-400 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}