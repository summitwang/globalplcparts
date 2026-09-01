"use client";

import { useEffect, useState } from "react";

type ImageManagerStats = {
  totalProducts: number;
  totalBrands: number;
  brands: Array<{
    brand: string;
    count: number;
  }>;
};

export default function ImageManagerPage() {
  const [stats, setStats] = useState<ImageManagerStats | null>(null);

  useEffect(() => {
    fetch("/api/admin/image-manager")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return (
      <div className="p-10">
        Loading...
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">

      <h1 className="text-5xl font-black mb-8">
        Product Image Manager PRO MAX v5
      </h1>

      <div className="grid md:grid-cols-3 gap-4 mb-10">

        <div className="border rounded-2xl p-5">
          <div>Total Products</div>
          <div className="text-4xl font-black">
            {stats.totalProducts}
          </div>
        </div>

        <div className="border rounded-2xl p-5">
          <div>Total Brands</div>
          <div className="text-4xl font-black">
            {stats.totalBrands}
          </div>
        </div>

      </div>

      <div className="border rounded-2xl p-6">

        <h2 className="text-2xl font-black mb-6">
          Brand Statistics
        </h2>

        <div className="space-y-3">

          {stats.brands.map(
            (brand, index) => (
              <div
                key={index}
                className="flex justify-between border-b pb-2"
              >
                <span>{brand.brand}</span>
                <span>{brand.count}</span>
              </div>
            )
          )}

        </div>

      </div>

    </main>
  );
}
