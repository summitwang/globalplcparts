import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const PRODUCTS_PATH = path.join(
  process.cwd(),
  "data",
  "products.json"
);

export async function GET() {
  try {
    const products = JSON.parse(
      fs.readFileSync(PRODUCTS_PATH, "utf8")
    );

    const brandStats: Record<string, number> = {};

    for (const product of products) {
      const brand = product.brand || "Unknown";

      brandStats[brand] =
        (brandStats[brand] || 0) + 1;
    }

    const brands = Object.entries(brandStats)
      .sort((a, b) => b[1] - a[1])
      .map(([brand, count]) => ({
        brand,
        count,
      }));

    return NextResponse.json({
      totalProducts: products.length,
      totalBrands: brands.length,
      brands,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed" },
      { status: 500 }
    );
  }
}