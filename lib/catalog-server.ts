import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import type { Product } from '@/data/products';
import { validateProducts } from './seo-core';

// Request-scoped snapshot: never writes to, locks or changes crawler state.
// A deployed immutable filesystem reflects its deployed snapshot, not this workstation.
export const readProducts = cache((): Product[] => validateProducts(
  JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/products.json'), 'utf8'))
));
