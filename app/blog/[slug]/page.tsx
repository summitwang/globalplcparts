import { blogPosts } from "@/data/blog-posts";
import { notFound } from "next/navigation";

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

  return (
    <main className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-5xl font-black mb-6">
        {post.title}
      </h1>

      <p className="text-slate-500 mb-8">
        {post.date}
      </p>

      <div className="prose max-w-none">
        <p>{post.description}</p>

        <p>
          GlobalPLCParts supplies PLC modules,
          DCS spare parts, HMI panels and industrial
          automation equipment worldwide.
        </p>

        <p>
          Contact us for RFQ, availability,
          lead time and shipping support.
        </p>
      </div>
    </main>
  );
}