import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_PATH = path.join(DATA_DIR, "products.json");
const LOG_PATH = path.join(DATA_DIR, "import-log.json");

type ImportValue = string | number | boolean | Date | null | undefined;
type ImportRow = Record<string, ImportValue>;

type ProductRecord = Record<string, unknown> & {
  brand?: unknown;
  brandSlug?: string;
  model?: string;
  image?: unknown;
};

type ImportLog = {
  id: string;
  date: string;
  fileName: string;
  found: number;
  imported: number;
  updated: number;
  totalProducts: number;
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function slugify(text: unknown) {
  return String(text || "")
    .toLowerCase()
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function detectBrand(text: unknown) {
  const brands = [
    "Siemens",
    "Allen Bradley",
    "Schneider",
    "ABB",
    "Honeywell",
    "Yokogawa",
    "Emerson",
    "Bently Nevada",
    "GE Fanuc",
    "Mitsubishi",
    "Omron",
    "Rexroth",
    "Beckhoff",
    "Keyence",
    "Danfoss",
    "Phoenix Contact",
  ];

  const lower = String(text || "").toLowerCase();
  return brands.find((b) => lower.includes(b.toLowerCase())) || "Industrial";
}

function normalizeImage(src: unknown) {
  if (!src) return "/product-images/default-plc.png";
  if ((src as string).startsWith("//")) return `https:${src}`;
  return src;
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function makeProduct(row: ImportRow): ProductRecord | null {
  const brand = row.brand || row.Brand || row.BRAND || "";
  const model = row.model || row.Model || row.MODEL || row.part_number || row.PartNumber || "";
  const title = row.title || row.Title || `${brand} ${model}`;

  const finalBrand = brand || detectBrand(title);
  const finalModel = model || title;

  if (!finalModel) return null;

  return {
    slug: slugify(`${finalBrand}-${finalModel}`),
    brand: finalBrand,
    brandSlug: slugify(finalBrand),
    model: String(finalModel).trim(),
    category: row.category || row.Category || "Industrial Automation Parts",
    description:
      row.description ||
      row.Description ||
      `${finalBrand} ${finalModel} industrial automation spare part for PLC, DCS, HMI, control system and factory maintenance applications.`,
    image: normalizeImage(row.image || row.Image || ""),
    sourceUrl: row.sourceUrl || row.SourceUrl || row.url || row.URL || "",
  };
}

function mergeProducts(newProducts: ProductRecord[]) {
  const existing = readJson<ProductRecord[]>(PRODUCTS_PATH, []);
  const map = new Map<string, ProductRecord>();

  for (const p of existing) {
    const key = `${p.brandSlug || slugify(p.brand)}-${p.model}`.toLowerCase();
    map.set(key, p);
  }

  let imported = 0;
  let updated = 0;

  for (const p of newProducts) {
    const key = `${p.brandSlug}-${p.model}`.toLowerCase();

    if (map.has(key)) {
      map.set(key, { ...map.get(key), ...p });
      updated++;
    } else {
      map.set(key, p);
      imported++;
    }
  }

  const finalProducts = Array.from(map.values());
  writeJson(PRODUCTS_PATH, finalProducts);

  return {
    imported,
    updated,
    totalProducts: finalProducts.length,
  };
}

function getStats() {
  const products = readJson<ProductRecord[]>(PRODUCTS_PATH, []);
  const logs = readJson<ImportLog[]>(LOG_PATH, []);

  const brands = new Set(
  products.map((p) => p.brand).filter(Boolean)
);

const missingImages = products.filter(
  (p) => !p.image
).length;

return {
  totalProducts: products.length,
  totalBrands: brands.size,
  missingImages,
  importHistory: logs.slice(-20).reverse(),
};
}

export async function GET() {
  return NextResponse.json(getStats());
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const password = String(form.get("password") || "");
    const file = form.get("file") as File | null;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({
        found: 0,
        imported: 0,
        updated: 0,
        totalProducts: getStats().totalProducts,
        error: "Wrong admin password",
      });
    }

    if (!file) {
      return NextResponse.json({
        found: 0,
        imported: 0,
        updated: 0,
        totalProducts: getStats().totalProducts,
        error: "Missing upload file",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet);

    const newProducts = rows
      .map((row) => makeProduct(row))
      .filter((product): product is ProductRecord => product !== null);

    const result = mergeProducts(newProducts);

    const logs = readJson<ImportLog[]>(LOG_PATH, []);

    const log = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      fileName: file.name,
      found: newProducts.length,
      imported: result.imported,
      updated: result.updated,
      totalProducts: result.totalProducts,
    };

    logs.push(log);
    writeJson(LOG_PATH, logs);

    return NextResponse.json({
      found: newProducts.length,
      imported: result.imported,
      updated: result.updated,
      totalProducts: result.totalProducts,
      jobId: log.id,
      error: null,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      found: 0,
      imported: 0,
      updated: 0,
      totalProducts: getStats().totalProducts,
      error: error instanceof Error ? error.message : "Import failed",
    });
  }
}
