export function getMappedImage(
  brand: string,
  model: string
) {
  const m = model.toUpperCase();

  if (brand === "Siemens") {

    if (m.startsWith("6ES7"))
      return "/product-images/real/siemens/siemens-s7-300.jpg";

    if (m.startsWith("6AV"))
      return "/product-images/real/siemens/siemens-hmi.jpg";

    if (m.startsWith("6GK"))
      return "/product-images/real/siemens/siemens-et200.jpg";

    return "/product-images/real/siemens/siemens-s7-300.jpg";
  }

  return null;
}