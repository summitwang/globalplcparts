/* eslint-disable @typescript-eslint/no-require-imports -- 共享 CommonJS 模块供 Next.js 与离线 Node 测试使用。 */
/* 只读进程级目录索引：文件版本改变时整体替换，不触碰采集锁和断点。 */
const fs = require('node:fs');
const { validateProducts, brandsFor } = require('./seo-core');
function createCatalogReader(file) {
  let snapshot, version;
  const stamp = () => { const s = fs.statSync(file, { bigint: true }); return `${s.dev}:${s.ino}:${s.size}:${s.mtimeNs}:${s.ctimeNs}`; };
  return () => {
    const before = stamp();
    if (snapshot && before === version) return snapshot;
    const products = validateProducts(JSON.parse(fs.readFileSync(file, 'utf8')));
    if (stamp() !== before) throw new Error('Catalog changed during read');
    const bySlug = new Map(), byBrand = new Map();
    for (const p of products) {
      Object.freeze(p); bySlug.set(p.slug, p);
      if (!byBrand.has(p.brandSlug)) byBrand.set(p.brandSlug, []);
      byBrand.get(p.brandSlug).push(p);
    }
    for (const rows of byBrand.values()) Object.freeze(rows);
    // 预先规范化搜索文本；不缓存任意用户查询，避免无界内存增长。
    const text = products.map(p => `${p.brand} ${p.model} ${p.category}`.toLowerCase());
    snapshot = { products: Object.freeze(products), brands: brandsFor(products), bySlug, byBrand,
      search: terms => terms.length ? products.filter((p,i) => terms.every(t => text[i].includes(t))) : products };
    version = before;
    return snapshot;
  };
}
module.exports = { createCatalogReader };
