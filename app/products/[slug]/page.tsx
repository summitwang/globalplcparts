import { products } from "@/data/products";
import Link from "next/link";
import ProductImage from "@/components/ProductImage";

const whatsappNumber = "13774696836";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = products.find(
    (item) => item.slug.toLowerCase() === slug.toLowerCase()
  );

  if (!product) {
    return {
      title: "Product Not Found | GlobalPLCParts",
    };
  }

  return {
  title: `${product.brand} ${product.model} PLC Module Supplier | GlobalPLCParts`,

  description: `${product.brand} ${product.model} ${product.category} available for industrial automation, PLC, DCS and control system applications. Request quotation from GlobalPLCParts.`,

  alternates: {
    canonical: `https://globalplcparts.com/products/${product.slug}`,
  },

  keywords: [
      product.model,
      product.brand,
      product.category,
      `${product.model} supplier`,
      `${product.brand} ${product.model}`,
    ],
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = products.find(
    (item) => item.slug.toLowerCase() === slug.toLowerCase()
  );

  if (!product) {
    return (
      <main className="min-h-screen bg-slate-50 p-10">
        <h1 className="text-4xl font-black mb-4">Product Not Found</h1>
        <Link href="/products" className="text-blue-600 font-bold">
          ← Back to Products
        </Link>
      </main>
    );
  }

  const relatedProducts = products
    .filter(
      (item) =>
        item.brandSlug === product.brandSlug && item.slug !== product.slug
    )
    .slice(0, 6);

  const message = encodeURIComponent(
    `RFQ Request\nModel: ${product.model}\nBrand: ${product.brand}\nQuantity:\nCountry:\nMessage:`
  );

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${product.brand} ${product.model}`,
  description: product.description,
  sku: product.model,
  mpn: product.model,
  brand: {
    "@type": "Brand",
    name: product.brand,
  },
  category: product.category,
  url: `https://globalplcparts.com/products/${product.slug}`,
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
    priceCurrency: "USD",
    seller: {
      "@type": "Organization",
      name: "GlobalPLCParts",
    },
  },
};

return (
  <main className="min-h-screen bg-slate-50 text-slate-900">
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(productJsonLd),
    }}
  />
      

      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-blue-600">
            Products
          </Link>
          <span className="mx-2">/</span>
          <span>{product.model}</span>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10">
        <div className="bg-white border rounded-3xl shadow-sm p-8">
          <div className="aspect-square bg-slate-100 rounded-2xl border flex items-center justify-center overflow-hidden">
            {product.image ? (
  <div className="w-full h-full flex flex-col items-center justify-center">
    <ProductImage
    src={product.image}
    brand={product.brand}
    model={product.model}
    className="max-w-full max-h-full object-contain p-8"
/>

    <p className="text-xs text-red-600 break-all mt-3">
      Image path: {product.image}
    </p>
  </div>
) : (
              <div className="text-center">
                <div className="text-6xl font-black text-blue-600 mb-4">
                  PLC
                </div>
                <div className="text-slate-400 font-bold">Product Image</div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-3xl shadow-sm p-8">
          <p className="text-blue-600 font-black mb-4">{product.brand}</p>

          <h1 className="text-5xl font-black leading-tight mb-4">
            {product.model}
          </h1>

          <p className="text-xl text-slate-500 mb-6">{product.category}</p>

          <p className="text-slate-700 leading-8 mb-8">
            {product.description}
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <Info label="Brand" value={product.brand} />
            <Info label="Model" value={product.model} />
            <Info label="Category" value={product.category} />
            <Info label="Condition" value="New / Used / Refurbished" />
            <Info label="Availability" value="Contact for Stock" />
            <Info label="Warranty" value="12 Months Available" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <a
              href={whatsappLink}
              target="_blank"
              className="bg-green-500 text-white text-center py-4 rounded-xl font-black"
            >
              WhatsApp Quote
            </a>

            <Link
              href={`/request-quote?model=${encodeURIComponent(product.model)}`}
              className="bg-blue-600 text-white text-center py-4 rounded-xl font-black"
            >
              Submit RFQ
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border rounded-3xl p-8">
          <h2 className="text-3xl font-black mb-6">
            About {product.brand} {product.model}
          </h2>

          <p className="text-slate-700 leading-8 mb-6">
            {product.brand} {product.model} is supplied by GlobalPLCParts for
            industrial automation, PLC systems, DCS systems, factory control,
            process automation and maintenance replacement projects.
          </p>

          <p className="text-slate-700 leading-8">
            Customers can send model number, quantity and destination country to
            request quotation, availability, lead time and shipping options.
          </p>
        </div>

        <aside className="bg-white border rounded-3xl p-8">
          <h2 className="text-2xl font-black mb-4">Quick RFQ</h2>

          <div className="space-y-4 text-sm text-slate-600 mb-6">
            <p>Model: {product.model}</p>
            <p>Brand: {product.brand}</p>
            <p>Reply: Usually within 24 hours</p>
          </div>

          <Link
            href={`/request-quote?model=${encodeURIComponent(product.model)}`}
            className="block bg-blue-600 text-white text-center py-4 rounded-xl font-black"
          >
            Request Best Price
          </Link>
        </aside>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="bg-white border rounded-3xl p-8">
          <h2 className="text-3xl font-black mb-6">Product Specifications</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <Spec label="Manufacturer" value={product.brand} />
            <Spec label="Part Number" value={product.model} />
            <Spec label="Product Type" value={product.category} />
            <Spec label="Application" value="Industrial Automation" />
            <Spec label="Stock Status" value="Contact for Availability" />
            <Spec label="Shipping" value="Worldwide Shipping Support" />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
  <div className="grid lg:grid-cols-2 gap-8">

    <div className="bg-white border rounded-3xl p-8">
      <h2 className="text-3xl font-black mb-6">
        Applications
      </h2>

      <ul className="space-y-3">
        <li>✓ PLC Control Systems</li>
        <li>✓ DCS Process Automation</li>
        <li>✓ Factory Maintenance</li>
        <li>✓ Production Line Control</li>
        <li>✓ Industrial Machinery</li>
        <li>✓ Replacement Projects</li>
      </ul>
    </div>

    <div className="bg-white border rounded-3xl p-8">
      <h2 className="text-3xl font-black mb-6">
        Features
      </h2>

      <ul className="space-y-3">
        <li>✓ Worldwide Supply</li>
        <li>✓ Fast RFQ Response</li>
        <li>✓ Obsolete Parts Support</li>
        <li>✓ Global Shipping</li>
        <li>✓ Industrial Automation Expertise</li>
        <li>✓ Quality Inspection Available</li>
      </ul>
    </div>

  </div>
</section>

<section className="max-w-7xl mx-auto px-6 pb-16">
  <div className="bg-white border rounded-3xl p-8">

    <h2 className="text-3xl font-black mb-8">
      Frequently Asked Questions
    </h2>

    <div className="space-y-6">

      <div>
        <h3 className="font-black mb-2">
          Is {product.model} available in stock?
        </h3>

        <p>
          Contact our sales team for current stock status and lead time.
        </p>
      </div>

      <div>
        <h3 className="font-black mb-2">
          Do you ship worldwide?
        </h3>

        <p>
          Yes. GlobalPLCParts supports worldwide shipping.
        </p>
      </div>

      <div>
        <h3 className="font-black mb-2">
          Can you supply obsolete parts?
        </h3>

        <p>
          Yes. We specialize in sourcing hard-to-find and obsolete industrial automation parts.
        </p>
      </div>

    </div>

  </div>
</section>

      {relatedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pb-16">
          <h2 className="text-3xl font-black mb-6">
            Related {product.brand} Products
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {relatedProducts.map((item) => (
              <Link
                key={item.slug}
                href={`/products/${item.slug}`}
                className="bg-white border rounded-2xl p-6 hover:shadow-md transition"
              >
                <p className="text-blue-600 font-bold mb-2">{item.brand}</p>
                <h3 className="text-xl font-black mb-3">{item.model}</h3>
                <p className="text-slate-500">{item.category}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <a
        href={whatsappLink}
        target="_blank"
        className="fixed right-6 bottom-6 z-50 bg-green-500 text-white px-6 py-4 rounded-full shadow-lg font-black"
      >
        WhatsApp
      </a>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-2xl p-4">
      <p className="text-slate-500 text-sm">{label}</p>
      <p className="font-black mt-1">{value}</p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-xl p-4 flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-right">{value}</span>
    </div>
  );
}