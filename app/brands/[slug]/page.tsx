import Link from "next/link";
import { products } from "@/data/products";

const whatsappNumber = "13774696836";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const brandProducts = products.filter(
    (item) => item.brandSlug.toLowerCase() === slug.toLowerCase()
  );

  const brandName = brandProducts[0]?.brand || slug;

  return {
  title: `${brandName} Industrial Automation Parts Supplier | GlobalPLCParts`,
  description: `Browse ${brandName} PLC, DCS, controller, HMI, module and industrial automation spare parts. Request quotation from GlobalPLCParts.`,

  alternates: {
    canonical: `https://globalplcparts.com/brands/${slug}`,
  },

  keywords: [
      `${brandName} supplier`,
      `${brandName} PLC parts`,
      `${brandName} automation parts`,
      `${brandName} spare parts`,
      `${brandName} module`,
    ],
  };
}

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const brandProducts = products.filter(
    (item) => item.brandSlug.toLowerCase() === slug.toLowerCase()
  );

  const brandName = brandProducts[0]?.brand || slug;

  const brandJsonLd = {
  "@context": "https://schema.org",
  "@type": "Brand",
  name: brandName,
  url: `https://globalplcparts.com/brands/${slug}`,
  description: `${brandName} industrial automation parts supplier`,
};

  const whatsappText = encodeURIComponent(
    `Hello GlobalPLCParts, I want to request a quote for ${brandName} industrial automation parts.`
  );

  if (brandProducts.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <h1 className="text-4xl font-black mb-4">Brand Not Found</h1>
        <Link href="/brands" className="text-blue-600 font-bold">
          ← Back to Brands
        </Link>
      </main>
    );
  }

  return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(brandJsonLd),
      }}
    />

    <main className="min-h-screen bg-slate-50 text-slate-900">
      

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="hover:text-blue-600">
            Brands
          </Link>
          <span className="mx-2">/</span>
          <span>{brandName}</span>
        </div>
      </section>

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-3 gap-10 items-center">
          <div className="lg:col-span-2">
            <p className="text-blue-600 font-black mb-4">
              Industrial Automation Brand Supplier
            </p>

            <h1 className="text-6xl font-black leading-tight mb-6">
              {brandName} Industrial Automation Parts Supplier
            </h1>

            <p className="text-xl text-slate-600 leading-8 max-w-4xl">
              GlobalPLCParts supplies {brandName} PLC modules, DCS modules,
              controllers, HMI panels, I/O modules and industrial automation
              spare parts for factory maintenance, process control and
              replacement projects worldwide.
            </p>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-8">
            <h2 className="text-3xl font-black mb-4">Need {brandName} Parts?</h2>

            <p className="text-slate-300 leading-7 mb-6">
              Send your model number, quantity and destination country. We will
              check price, availability and delivery time.
            </p>

            <Link
              href={`/request-quote?model=${encodeURIComponent(brandName)}`}
              className="block bg-green-500 text-white text-center py-4 rounded-xl font-black"
            >
              Request Best Price
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-5">
          <Info title="Brand" value={brandName} />
          <Info title="Products" value={`${brandProducts.length}+ Items`} />
          <Info title="Supply Type" value="PLC / DCS / HMI" />
          <Info title="Shipping" value="Worldwide Support" />
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-14">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-4xl font-black mb-3">
              {brandName} Products
            </h2>
            <p className="text-slate-600">
              Browse available {brandName} industrial automation spare parts.
            </p>
          </div>

          <Link
            href="/request-quote"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black"
          >
            Send RFQ
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {brandProducts.map((product) => (
            <Link
              key={product.slug}
              href={`/products/${product.slug}`}
              className="bg-white border rounded-3xl overflow-hidden hover:shadow-lg transition"
            >
              <div className="h-48 bg-slate-100 border-b flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={`${product.brand} ${product.model}`}
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
        <div className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-4xl font-black mb-6">
              About {brandName} Automation Parts
            </h2>

            <div className="hidden">
  {brandProducts.slice(0, 30).map((item) => (
    <span key={item.slug}>
      {item.brand} {item.model} PLC Module,
    </span>
  ))}
</div>

            <p className="text-slate-700 leading-8 mb-5">
              {brandName} products are widely used in industrial automation,
              manufacturing systems, process control, power plants, machinery
              control, water treatment, oil and gas, and factory maintenance
              projects.
            </p>

            <p className="text-slate-700 leading-8">
              GlobalPLCParts helps buyers source {brandName} spare parts by
              model number and supports quotation, stock checking, lead time
              confirmation and global shipping.
            </p>
          </div>

          <div className="bg-slate-50 border rounded-3xl p-8">
            <h3 className="text-3xl font-black mb-6">
              Common {brandName} Applications
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <Point text="PLC control systems" />
              <Point text="DCS process automation" />
              <Point text="Factory maintenance" />
              <Point text="Replacement spare parts" />
              <Point text="Production line control" />
              <Point text="Industrial repair projects" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-slate-900 text-white rounded-3xl p-10 text-center">
          <h2 className="text-4xl font-black mb-4">
            Looking for {brandName} Parts?
          </h2>

          <p className="text-slate-300 leading-8 mb-8 max-w-3xl mx-auto">
            Send us the exact part number, required quantity and destination
            country. Our team will help check availability, price and delivery
            options.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href={`/request-quote?model=${encodeURIComponent(brandName)}`}
              className="bg-green-500 text-white px-8 py-4 rounded-xl font-black"
            >
              Submit RFQ
            </Link>

            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
              className="bg-white text-slate-900 px-8 py-4 rounded-xl font-black"
            >
              WhatsApp Quote
            </a>
          </div>
        </div>
      </section>

      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
        target="_blank"
        className="fixed right-6 bottom-6 z-50 bg-green-500 text-white px-6 py-4 rounded-full shadow-lg font-black"
      >
        WhatsApp
      </a>
    </main>
    </>
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