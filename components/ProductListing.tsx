import Link from 'next/link';
import ProductImage from './ProductImage';
import type { Product } from '@/data/products';
import { PAGE_SIZE, pagePath } from '@/lib/seo-core';

export default function ProductListing({ products, page, base }: { products: Product[]; page: number; base: string }) {
  const pages = Math.ceil(products.length / PAGE_SIZE);
  return <>
    <p className="my-6 text-slate-600">{products.length} catalog entries. Availability is confirmed by quotation.</p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(p => <Link key={p.slug} href={`/products/${p.slug}`} className="bg-white border rounded-3xl p-6 hover:shadow-lg">
        <div className="h-48"><ProductImage src={p.image} brand={p.brand} model={p.model} /></div>
        <p className="text-blue-600 font-bold mt-4">{p.brand}</p><h2 className="text-xl font-black">{p.model}</h2><p>{p.category}</p>
      </Link>)}
    </div>
    {pages > 1 && <nav aria-label="Product pagination" className="flex flex-wrap gap-3 my-8">
      {Array.from({length: pages}, (_,i) => i+1).filter(n => n === 1 || n === pages || Math.abs(n-page) <= 2).map(n => <Link key={n} href={pagePath(base,n)} aria-current={n===page?'page':undefined} className="border rounded px-4 py-2">{n}</Link>)}
      <span className="p-2">Page {page} of {pages}</span>
    </nav>}
  </>;
}
