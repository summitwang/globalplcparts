"use client";

import { useState } from "react";
import { applicationImage, FALLBACK } from "@/lib/product-image-policy";

type ProductImageProps = { src?: string; brand?: string; model?: string; className?: string };

export default function ProductImage({ src, brand, model, className = "h-full w-full object-contain p-5" }: ProductImageProps) {
  const safeSrc = applicationImage(src);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = failedSrc === safeSrc ? FALLBACK : safeSrc;
  return <img src={imageSrc} alt={`${brand || "Industrial"} ${model || "Product"}`}
    loading="lazy" className={className}
    onError={() => { if (imageSrc !== FALLBACK) setFailedSrc(safeSrc); }} />;
}
