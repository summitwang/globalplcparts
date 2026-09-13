"use strict";
// Public frontend request adapter. No cookies, private credentials, environment files,
// remote code execution, redirects, detail scraping or unrelated API operations.
const { BRANDS, PAGE_SIZE, fail } = require("./classic-automation-complete-crawl");
const ORIGIN = "https://www.classicautomation.com";
const SEARCH = "https://commerce.adobe.io/search/graphql";
// Same productSearch selection and fragments as public @magento/search-sdk 0.8.9,
// products=true, facets=true, suggestions=false, preview=false. Commercial fields
// are part of that public operation but are discarded, never imported or logged.
const QUERY = `query productSearch(
 $phrase: String! $page_size: Int $current_page: Int $filter: [SearchClauseInput!]
 $sort: [ProductSearchSortInput!] $context: QueryContextInput
) { productSearch(phrase: $phrase page_size: $page_size current_page: $current_page
 filter: $filter sort: $sort context: $context) {
 total_count items @include(if: true) { product { ...Products } highlights { ...Highlights } }
 facets @include(if: true) { ...Facets } suggestions @include(if: false) related_terms page_info { ...PageInfo }
} }
fragment Facets on Aggregation { title attribute buckets { __typename title ... on ScalarBucket { id count } ... on RangeBucket { from to count } ... on StatsBucket { min max } } }
fragment Highlights on Highlight { attribute value matched_words }
fragment PageInfo on SearchResultPageInfo { current_page page_size total_pages }
fragment Products on ProductInterface {
 __typename id uid name sku description { html } short_description { html } attribute_set_id
 meta_title meta_keyword meta_description image { ...ProductImage } small_image { ...ProductImage }
 thumbnail { ...ProductImage } new_from_date new_to_date created_at updated_at
 price_range { minimum_price { ...ProductPrice } maximum_price { ...ProductPrice } }
 gift_message_available canonical_url media_gallery { url label position disabled }
 add_to_cart_allowed custom_attributes { code value }
}
fragment ProductImage on ProductImage { url label position disabled }
fragment ProductPrice on ProductPrice { fixed_product_taxes { amount { ...Money } label }
 regular_price { ...Money } final_price { ...Money } discount { percent_off amount_off } }
fragment Money on Money { value currency }`;
function parseConfig(html, rule) {
  const $ = require("cheerio").load(html);
  const root = $('[x-data="liveSearchPlp()"]');
  if (root.length !== 1 || root.attr("data-category-url-path") !== rule.category) fail("PUBLIC_CATEGORY_MISMATCH");
  const fields = ["environment-id", "website-code", "store-code", "store-view-code", "api-key", "customer-group"];
  const config = Object.fromEntries(fields.map(f => [f, root.attr(`data-${f}`)]));
  if (fields.some(f => typeof config[f] !== "string" || !config[f] || /[\r\n]/.test(config[f]))) fail("PUBLIC_CONFIG_MISSING");
  const sdk = $('script[src]').map((i, e) => $(e).attr("src")).get().filter(u => u.includes("/Hyva_MagentoLiveSearch/js/sdk.js"));
  if (sdk.length !== 1 || new URL(sdk[0]).origin !== ORIGIN) fail("PUBLIC_SDK_SCOPE");
  return { ...config, sdk: sdk[0] };
}
function parseResponse(body, rule, page) {
  if (!body || body.errors?.length || !body.data?.productSearch) fail("GRAPHQL_LISTING_ERROR");
  const ps = body.data.productSearch;
  if (!Array.isArray(ps.items) || !ps.page_info) fail("GRAPHQL_LISTING_SHAPE");
  const $ = require("cheerio").load("");
  const text = html => $.load(String(html || ""))("body").text().replace(/\s+/g, " ").trim();
  const items = ps.items.map(item => {
    const p = item.product;
    if (!p || typeof p.sku !== "string" || !p.sku.trim() || typeof p.canonical_url !== "string") fail("PUBLIC_PRODUCT_IDENTITY");
    const url = new URL(p.canonical_url, ORIGIN);
    if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash ||
        !/^\/(?:[a-z0-9._~-]+|parts\/[a-z0-9-]+\/[a-z0-9._~-]+)$/i.test(url.pathname)) fail("PUBLIC_PRODUCT_SCOPE");
    // The public listing's name and SKU are the model (including revision slashes).
    // Canonical product URLs now live at the site root. Membership is established
    // by the exact approved categoryPath request, never inferred from that URL.
    const model = p.sku.trim();
    if (!model || model.length > 160) fail("PUBLIC_MODEL_AMBIGUOUS");
    return { id: p.sku.trim(), model, sourceUrl: url.href,
      description: text(p.short_description?.html || p.description?.html),
      image: p.image?.url || p.thumbnail?.url || "" };
  });
  return { page: ps.page_info.current_page, pageSize: ps.page_info.page_size,
    pages: ps.page_info.total_pages, total: ps.total_count, items };
}
function createSource({ request, pause = ms => new Promise(resolve => setTimeout(resolve, ms)), paceMs = 3000 } = {}) {
  const axios = request || require("axios").request;
  const cache = new Map();
  async function fetch(url, method = "GET", headers = {}, data) {
    const u = new URL(url);
    if (u.username || u.password || u.hash || !((u.origin === ORIGIN && (u.pathname.startsWith("/parts/") || u.pathname.startsWith("/static/"))) || url === SEARCH)) fail("NETWORK_SCOPE");
    for (let attempt = 0; attempt < 2; attempt++) {
      await pause(attempt ? 10000 : paceMs);
      try {
        const result = await axios({ url, method, headers, data, timeout: 30000, maxRedirects: 0,
          maxContentLength: 16000000, maxBodyLength: 100000, validateStatus: status => status === 200 });
        if (result.status !== 200) fail("HTTP_STATUS");
        return result.data;
      } catch (e) {
        const status = e.response?.status;
        if (status === 401 || status === 403 || status === 429) fail(`HTTP_${status}`);
        if (status && status < 500) fail(`HTTP_${status}`);
        if (attempt === 1) fail("NETWORK_RETRY_EXHAUSTED");
      }
    }
  }
  return { async list(rule, page) {
    if (!BRANDS.some(b => b.slug === rule.slug && b.category === rule.category) || !Number.isInteger(page) || page < 1) fail("LISTING_SCOPE");
    if (!cache.has(rule.slug)) {
      const config = parseConfig(await fetch(`${ORIGIN}/${rule.category}`), rule);
      const sdk = await fetch(config.sdk);
      if (typeof sdk !== "string" || !sdk.includes(SEARCH) || !sdk.includes("query productSearch(") || !sdk.includes("total_pages")) fail("PUBLIC_SDK_CHANGED");
      cache.set(rule.slug, config);
    }
    const c = cache.get(rule.slug);
    const headers = { "Content-Type": "application/json", "Magento-Environment-Id": c["environment-id"],
      "Magento-Website-Code": c["website-code"], "Magento-Store-Code": c["store-code"],
      "Magento-Store-View-Code": c["store-view-code"], "X-Api-Key": c["api-key"],
      "X-Request-Id": require("node:crypto").randomUUID(), "Magento-Is-Preview": "false" };
    const body = await fetch(SEARCH, "POST", headers, { query: QUERY, variables: {
      phrase: "", page_size: PAGE_SIZE, current_page: page,
      filter: [{ attribute: "categoryPath", eq: rule.category }], sort: [], context: { customerGroup: c["customer-group"] },
    } });
    return parseResponse(body, rule, page);
  } };
}
module.exports = { QUERY, SEARCH, parseConfig, parseResponse, createSource };
