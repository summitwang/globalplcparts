import path from 'node:path';
import { cache } from 'react';
import { createCatalogReader } from './catalog-cache';
// 请求内一致快照 + 进程间隔复用；部署使用自身目录，本地采集更新按文件版本失效。
const load = createCatalogReader(path.join(process.cwd(), 'data/products.json'));
export const readCatalog = cache(load);
export const readProducts = () => readCatalog().products;
