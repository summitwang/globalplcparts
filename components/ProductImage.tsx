"use client";

import { useMemo, useState } from "react";

type ProductImageProps = {
  src?: string;
  brand?: string;
  model?: string;
  className?: string;
};

export function getFallbackImage(brand?: string) {
  const map: Record<string, string> = {
    ABB: "/product-images/abb.svg",
    "Allen Bradley": "/product-images/allen-bradley.svg",
    Siemens: "/product-images/siemens.svg",
    Schneider: "/product-images/schneider.svg",
    Omron: "/product-images/omron.svg",
    Mitsubishi: "/product-images/mitsubishi.svg",
    Honeywell: "/product-images/honeywell.svg",
    Yokogawa: "/product-images/yokogawa.svg",
    Emerson: "/product-images/emerson.svg",
    "GE Fanuc": "/product-images/ge-fanuc.svg",
    "Bently Nevada": "/product-images/bently-nevada.svg",
    Foxboro: "/product-images/foxboro.svg",
    HIMA: "/product-images/hima.svg",
    Bachmann: "/product-images/bachmann.svg",
    Rexroth: "/product-images/rexroth.svg",
    ProSoft: "/product-images/prosoft.svg",
    Woodward: "/product-images/woodward.svg",
  };

  return map[String(brand || "")] || "/product-images/default.svg";
}

function isBadSrc(src?: string) {
  const value = String(src || "").trim();

  if (!value) return true;
  if (value === "undefined") return true;
  if (value === "null") return true;
  if (value.includes("undefined")) return true;
  if (value.includes("null")) return true;

  return false;
}

export default function ProductImage({
  src,
  brand,
  model,
  className = "h-full w-full object-contain p-5",
}: ProductImageProps) {
  const fallback = useMemo(() => getFallbackImage(brand), [brand]);
  const finalDefault = "/product-images/default.svg";

  const [imageSrc, setImageSrc] = useState(
    isBadSrc(src) ? fallback : String(src)
  );

  return (
    <img
      src={imageSrc}
      alt={`${brand || "Industrial"} ${model || "Product"}`}
      loading="lazy"
      className={className}
      onError={() => {
        if (imageSrc !== fallback) {
          setImageSrc(fallback);
        } else if (imageSrc !== finalDefault) {
          setImageSrc(finalDefault);
        }
      }}
    />
  );
}