import Link from 'next/link';
import { readCatalog } from '@/lib/catalog-server';
import { notFound } from 'next/navigation';
import { pageNumber, PAGE_SIZE } from '@/lib/seo-core';
import ProductImage from '@/components/ProductImage';
export const dynamic='force-dynamic';
export default async function SearchPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query=await searchParams;
  const q=typeof query.q==='string'?query.q.trim().slice(0,200):'';
  const terms=q.toLowerCase().split(/\s+/).filter(Boolean);
  const products=readCatalog().search(terms);
  const page=pageNumber(query.page);
  if(!page||page>Math.max(1,Math.ceil(products.length/PAGE_SIZE))) notFound();
  const base=`/search?q=${encodeURIComponent(q)}`;
  return <main className="max-w-7xl mx-auto px-6 py-12"><h1 className="text-4xl font-black mb-6">Search automation parts</h1><form action="/search" className="flex gap-3"><label className="sr-only" htmlFor="q">Brand or model</label><input id="q" name="q" defaultValue={q} className="border rounded p-3 flex-1" /><button className="bg-blue-600 text-white rounded px-6">Search</button></form><p className="my-6">{products.length} matches</p><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{products.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE).map(p=><Link href={`/products/${p.slug}`} key={p.slug} className="border rounded-xl p-6"><div className="h-40"><ProductImage src={p.image} brand={p.brand} model={p.model}/></div><h2 className="font-bold">{p.brand} {p.model}</h2></Link>)}</div><nav aria-label="Search pagination" className="flex gap-6 my-6">{page>1&&<Link href={`${base}&page=${page-1}`}>Previous</Link>}{page*PAGE_SIZE<products.length&&<Link href={`${base}&page=${page+1}`}>Next</Link>}</nav></main>;
}
