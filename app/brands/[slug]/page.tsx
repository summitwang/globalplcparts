import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { readProducts } from '@/lib/catalog-server';
import { brandsFor, brandMeta, breadcrumbs, PAGE_SIZE, pageNumber, pagePath } from '@/lib/seo-core';
import ProductListing from '@/components/ProductListing';
import SeoJsonLd from '@/components/SeoJsonLd';
export const dynamic = 'force-dynamic';
type Props = {params:Promise<{slug:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
async function context({params,searchParams}:Props) {
  const {slug}=await params, query=await searchParams;
  const products=readProducts();
  const brand=brandsFor(products).find(b=>b.slug===slug.toLowerCase());
  const page=pageNumber(query.page);
  if(!brand || !page || page>Math.ceil(brand.count/PAGE_SIZE)) notFound();
  const base=`/brands/${brand.slug}`;
  if(slug!==brand.slug || query.page==='1') permanentRedirect(pagePath(base,page));
  return {brand,page,base,products:products.filter(p=>p.brandSlug===brand.slug),filtered:Object.keys(query).some(k=>k!=='page')};
}
export async function generateMetadata(props:Props) {
  const {brand,page,filtered}=await context(props);
  return {...brandMeta(brand,page),robots:{index:!filtered,follow:true}};
}
export default async function BrandPage(props:Props) {
  const {brand,page,base,products}=await context(props);
  return <main className="min-h-screen bg-slate-50 text-slate-900">
    <SeoJsonLd data={breadcrumbs([['Home','/'],['Brands','/brands'],[brand.name,base]])} />
    <section className="bg-white border-b"><div className="max-w-7xl mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="mb-6 text-blue-600"><Link href="/">Home</Link> / <Link href="/brands">Brands</Link> / {brand.name}</nav>
      <h1 className="text-5xl font-black mb-6">{brand.name} Industrial Automation Parts{page>1?` - Page ${page}`:''}</h1>
      <p className="text-xl text-slate-600 leading-8">GlobalPLCParts helps industrial buyers source {brand.name} automation parts for maintenance and replacement projects. Browse {brand.count} catalog entries and send the exact part number, quantity and destination in your enquiry.</p>
      <p className="my-5 leading-8">Confirm compatibility against your equipment documentation. Availability, condition, lead time and any warranty terms are confirmed in the quotation.</p>
      <Link href={`/request-quote?model=${encodeURIComponent(brand.name)}`} className="inline-block bg-blue-600 text-white rounded-xl px-6 py-3 font-bold">Request a quotation</Link>
    </div></section>
    <section className="max-w-7xl mx-auto px-6 py-8"><ProductListing products={products} page={page} base={base} /></section>
  </main>;
}
