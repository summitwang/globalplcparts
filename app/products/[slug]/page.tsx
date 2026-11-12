import { readCatalog } from "@/lib/catalog-server";
import { notFound, permanentRedirect } from "next/navigation";
import { productMeta, productSchema, breadcrumbs } from "@/lib/seo-core";
import SeoJsonLd from "@/components/SeoJsonLd";
// 仅对公开内容使用小时级 ISR，保持业务数据与用户请求隔离。
export const revalidate = 3600;
export function generateStaticParams() { return []; }
import Link from "next/link";
import ProductImage from "@/components/ProductImage";

const whatsappNumber = "13774696836";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 const product=readCatalog().bySlug.get(slug.toLowerCase());
 if(!product) notFound();
 return productMeta(product);
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const catalog = readCatalog();

  const product = catalog.bySlug.get(slug.toLowerCase());

  if (!product) notFound();
  if (slug !== product.slug) permanentRedirect(`/products/${product.slug}`);

  const relatedProducts = (catalog.byBrand.get(product.brandSlug) || [])
    .filter(
      (item) =>
        item.brandSlug === product.brandSlug && item.slug !== product.slug
    )
    .slice(0, 6);

  const message = encodeURIComponent(
    `RFQ Request\nModel: ${product.model}\nBrand: ${product.brand}\nQuantity:\nCountry:\nMessage:`
  );

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${message}`;

const productJsonLd = [productSchema(product), breadcrumbs([["Home", "/"], ["Brands", "/brands"], [product.brand, `/brands/${product.brandSlug}`], [product.model, `/products/${product.slug}`]])];

// 长型号允许自然换行，避免移动端网格被最小内容宽度撑开；保留完整型号。
return (
  <main className="min-h-screen bg-slate-50 text-slate-900 [overflow-wrap:anywhere]">
  <SeoJsonLd data={productJsonLd} />
      

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
          <Link href={`/brands/${product.brandSlug}`}>{product.brand}</Link><span className="mx-2">/</span><span>{product.model}</span>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10">
        <div className="bg-white border rounded-3xl shadow-sm p-8">
          <div className="aspect-square bg-slate-100 rounded-2xl border flex items-center justify-center overflow-hidden">
            <ProductImage src={product.image} brand={product.brand} model={product.model} className="max-w-full max-h-full object-contain p-8" />
          </div>
        </div>

        <div className="bg-white border rounded-3xl shadow-sm p-8">
          <Link href={`/brands/${product.brandSlug}`} className="text-blue-600 font-black mb-4">{product.brand}</Link>

          <h1 className="text-5xl font-black leading-tight mb-4">
            {product.model}
          </h1>

          <p className="text-xl text-slate-500 mb-6">{product.category}</p>

          <p className="text-slate-700 leading-8 mb-8">
            {productMeta(product).description}
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <Info label="Brand" value={product.brand} />
            <Info label="Model" value={product.model} />
            <Info label="Category" value={product.category} />
            <Info label="Condition" value="Confirm in quotation" />
            <Info label="Availability" value="Contact for Stock" />
            <Info label="Warranty" value="Confirm terms in quotation" />
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
            GlobalPLCParts helps buyers source {product.brand} {product.model} for maintenance and replacement enquiries. Verify compatibility and specifications against your equipment documentation before ordering.
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
            <p>Include the exact part number and required quantity</p>
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
