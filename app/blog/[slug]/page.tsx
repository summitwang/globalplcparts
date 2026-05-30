import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";
import { products } from "@/data/products";
import { notFound } from "next/navigation";

const siteUrl = "https://globalplcparts.com";
const whatsappNumber = "13774696836";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    return {
      title: "Blog Post Not Found | GlobalPLCParts",
      description: "Industrial automation article not found.",
    };
  }

  return {
    title: `${post.title} | GlobalPLCParts Blog`,
    description: post.description || post.excerpt,
    alternates: {
      canonical: `${siteUrl}/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const relatedProducts = products.slice(0, 6);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description || post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: "GlobalPLCParts",
    },
    publisher: {
      "@type": "Organization",
      name: "GlobalPLCParts",
    },
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };

  const whatsappText = encodeURIComponent(
    `Hello, I want to ask about ${post.title}.`
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd),
        }}
      />

      <section className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-6 text-sm text-slate-500">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/blog" className="hover:text-blue-600">
            Blog
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-900 font-bold">{post.title}</span>
        </div>
      </section>

      <article className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-blue-600 font-black mb-3">{post.category}</p>

          <h1 className="text-5xl font-black leading-tight mb-6">
            {post.title}
          </h1>

          <p className="text-slate-500">{post.date}</p>
        </div>

        <div className="bg-white border rounded-3xl p-8 shadow-sm space-y-8 leading-8 text-slate-700">
          <p className="text-xl text-slate-700">
            {post.description || post.excerpt}
          </p>

          <section>
            <h2 className="text-3xl font-black text-slate-900 mb-4">
              Overview
            </h2>
            <p>
              Industrial automation systems rely on stable PLC modules, DCS
              spare parts, HMI panels, controllers, communication modules,
              sensors, drives and power supplies. For maintenance teams,
              sourcing the correct part number is critical because factories
              often need fast replacement support to reduce downtime.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-900 mb-4">
              Why This Topic Matters
            </h2>
            <p>
              Many industrial plants operate equipment for more than ten years.
              During that time, some automation components become discontinued,
              obsolete or difficult to source from official channels. A reliable
              industrial spare parts supplier helps engineers find compatible
              parts, verify model numbers and request quotation quickly.
            </p>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-900 mb-4">
              Common Parts Involved
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>PLC CPU modules and I/O modules</li>
              <li>DCS controller modules and communication cards</li>
              <li>HMI panels and operator terminals</li>
              <li>Industrial power supplies and servo drives</li>
              <li>Safety modules, sensors and network components</li>
            </ul>
          </section>

          <section>
            <h2 className="text-3xl font-black text-slate-900 mb-4">
              How To Request a Quote
            </h2>
            <p>
              When requesting quotation, provide the exact model number,
              required quantity, destination country and any urgency information.
              If the part is obsolete, include photos of the label or nameplate
              to help identify the correct replacement or compatible option.
            </p>
          </section>

          <section className="bg-slate-100 border rounded-2xl p-6">
            <h2 className="text-2xl font-black text-slate-900 mb-3">
              Need Industrial Automation Parts?
            </h2>
            <p className="mb-5">
              GlobalPLCParts supplies PLC modules, DCS spare parts, HMI panels
              and industrial automation components for maintenance and
              replacement projects worldwide.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/request-quote"
                className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black"
              >
                Request RFQ
              </Link>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                className="bg-green-500 text-white px-6 py-3 rounded-xl font-black"
              >
                WhatsApp RFQ
              </a>
            </div>
          </section>
        </div>

        <section className="mt-12">
          <h2 className="text-3xl font-black mb-6">
            Related Industrial Products
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                className="bg-white border rounded-2xl p-5 hover:shadow-lg transition"
              >
                <p className="text-blue-600 font-bold mb-2">
                  {product.brand}
                </p>
                <h3 className="text-xl font-black mb-2">
                  {product.model}
                </h3>
                <p className="text-sm text-slate-500">
                  {product.category}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </article>
    </main>
  );
}