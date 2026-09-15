import { safeJson } from '@/lib/seo-core';
export default function SeoJsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}
