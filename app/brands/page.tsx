import Link from "next/link";
import { products } from "@/data/products";

export const metadata = {
  title: "Industrial Automation Brands | GlobalPLCParts",
  description:
    "Browse PLC, DCS, HMI, controller and industrial automation spare parts by brand. Request quotation from GlobalPLCParts.",
};

export default function BrandsPage() {
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
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <span>Brands</span>
        </div>
      </section>

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <p className="text-blue-600 font-black mb-4">
            Industrial Automation Brands
          </p>

          <h1 className="text-6xl font-black leading-tight mb-6">
            Browse Industrial Automation Parts by Brand
          </h1>

          <p className="text-xl text-slate-600 leading-8 max-w-4xl">
            Find PLC modules, DCS modules, HMI panels, controllers, I/O modules,
            servo drives and industrial automation spare parts by manufacturer
            brand. Send model number and quantity to request quotation.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-5">
          <Info title="Total Brands" value={`${brands.length}`} />
          <Info title="Product Database" value={`${products.length}+ Items`} />
          <Info title="Supply Type" value="PLC / DCS / HMI" />
          <Info title="RFQ Reply" value="Within 24 Hours" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-4xl font-black mb-3">
              Available Brands
            </h2>
            <p className="text-slate-600">
              Select a brand to view related industrial automation products.
            </p>
          </div>

          <Link
            href="/request-quote"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black"
          >
            Send RFQ
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/brands/${brand.slug}`}
              className="bg-white border rounded-3xl p-6 hover:shadow-lg hover:border-blue-600 transition"
            >
              <p className="text-2xl font-black mb-2">{brand.name}</p>

              <p className="text-slate-500 text-sm mb-5">
                {brand.count} products available
              </p>

              <span className="inline-block bg-blue-600 text-white px-5 py-3 rounded-xl font-black text-sm">
                View {brand.name} Parts
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-white border-y">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-4xl font-black mb-6">
              Industrial Automation Spare Parts by Brand
            </h2>

            <p className="text-slate-700 leading-8 mb-5">
              GlobalPLCParts helps customers source automation spare parts by
              brand and model number, including PLC modules, DCS parts, HMI
              panels, controllers, sensors, drives and industrial replacement
              parts.
            </p>

            <p className="text-slate-700 leading-8">
              Our RFQ process supports industrial maintenance teams, factories,
              engineering companies and automation buyers looking for reliable
              part sourcing and worldwide shipping support.
            </p>
          </div>

          <div className="bg-slate-50 border rounded-3xl p-8">
            <h3 className="text-3xl font-black mb-6">
              Common Product Types
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <Point text="PLC Modules" />
              <Point text="DCS Modules" />
              <Point text="HMI Panels" />
              <Point text="Controllers" />
              <Point text="I/O Modules" />
              <Point text="Servo Drives" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white border rounded-2xl p-6">
      <p className="text-slate-500 text-sm mb-2">{title}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function Point({ text }: { text: string }) {
  return (
    <div className="bg-white border rounded-2xl p-4 font-bold">
      ✓ {text}
    </div>
  );
}
