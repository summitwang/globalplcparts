import Link from "next/link";
import { blogPosts } from "@/data/blog-posts";

export const metadata = {
  title: "Industrial Automation Blog | GlobalPLCParts",
  description:
    "Industrial automation guides, PLC buying tips, DCS migration and spare parts sourcing.",
};

export default function BlogPage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-5xl font-black mb-8">
        Industrial Automation Blog
      </h1>

      <div className="grid gap-6">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="border rounded-2xl p-6 hover:shadow-lg transition"
          >
            <p className="text-blue-600 font-bold mb-2">
              {post.category}
            </p>

            <h2 className="text-2xl font-black mb-2">
              {post.title}
            </h2>

            <p className="text-slate-600">
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}