import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { readProducts } from '@/lib/catalog-server';
import { coreMeta, PAGE_SIZE, pageNumber } from '@/lib/seo-core';
import ProductListing from '@/components/ProductListing';
export const dynamic='force-dynamic';
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
async function context({searchParams}:Props) {
  const query=await searchParams;
  if(typeof query.brand==='string'||typeof query.search==='string'||typeof query.q==='string') {
    const q=[query.brand,query.search,query.q].filter(v=>typeof v==='string'&&v!=='all').join(' ');
    permanentRedirect(`/search?q=${encodeURIComponent(q)}`);
  }
  const products=readProducts(),page=pageNumber(query.page);
  if(!page||page>Math.ceil(products.length/PAGE_SIZE)) notFound();
  if(query.page==='1') permanentRedirect('/products');
  return {products,page,filtered:Object.keys(query).some(k=>k!=='page')};
}
export async function generateMetadata(props:Props) {const {page,filtered}=await context(props);return {...coreMeta('/products',page),robots:{index:!filtered,follow:true}};}
export default async function ProductsPage(props:Props) {
  const {products,page}=await context(props);
  return <main className="min-h-screen bg-slate-50 text-slate-900"><section className="max-w-7xl mx-auto px-6 py-12">
    <nav aria-label="Breadcrumb" className="mb-6"><Link href="/">Home</Link> / Products</nav>
    <h1 className="text-5xl font-black mb-6">Industrial Automation Parts{page>1?` - Page ${page}`:''}</h1>
    <p className="text-xl text-slate-600">Browse models for maintenance and replacement sourcing. <Link href="/brands" className="text-blue-600">Browse by brand</Link> or search for a specific part.</p>
    <form action="/search" className="flex gap-3 my-6"><label className="sr-only" htmlFor="catalog-query">Brand or model</label><input id="catalog-query" name="q" placeholder="Brand or model" className="border rounded-xl p-3 flex-1" /><button className="bg-blue-600 text-white rounded-xl px-6">Search</button></form>
    <ProductListing products={products} page={page} base="/products" />
  </section></main>;
}
