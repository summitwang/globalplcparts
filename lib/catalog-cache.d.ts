import type { Product } from '@/data/products';
import type { Brand } from './seo-core';
export type Catalog = {products:Product[];brands:Brand[];bySlug:Map<string,Product>;byBrand:Map<string,Product[]>;search:(terms:string[])=>Product[]};
export function createCatalogReader(file:string):()=>Catalog;
