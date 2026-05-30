import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const email = "summit.plc01@gmail.com";
const whatsappNumber = "8613774696836";

export const metadata: Metadata = {
  title: "GlobalPLCParts | Industrial Automation Parts Supplier",
  description:
    "GlobalPLCParts supplies PLC, DCS, HMI, controller and industrial automation spare parts worldwide.",
verification: {
  google: "4F3xpyojabevBgIuU9zHRqhyIOCCNFBYEOh4i82K1S0",
},
  };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const whatsappText = encodeURIComponent(
    "Hello GlobalPLCParts, I want to request a quotation for industrial automation spare parts."
  );

  return (
    <html lang="en">
      <body>
        <div className="bg-slate-900 text-white text-sm">
          <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-4">
              <a href={`mailto:${email}`} className="hover:text-blue-300">
                Email: {email}
              </a>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                className="hover:text-green-300"
              >
                WhatsApp RFQ
              </a>
            </div>

            <div className="text-slate-300">
              Fast RFQ Reply · Worldwide Industrial Parts Supply
            </div>
          </div>
        </div>

        <header className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <Link href="/" className="text-2xl font-black whitespace-nowrap">
              Global<span className="text-blue-600">PLC</span>Parts
            </Link>

            <form action="/search" className="flex-1 max-w-2xl flex gap-2">
              <input
                name="q"
                placeholder="Search model number, brand, PLC, DCS..."
                className="w-full border rounded-xl px-4 py-3 outline-none focus:border-blue-600"
              />

              <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black">
                Search
              </button>
            </form>

            <nav className="flex flex-wrap gap-5 text-sm font-bold text-slate-600 items-center">
              <Link href="/products" className="hover:text-blue-600">
                Products
              </Link>

              <Link href="/brands" className="hover:text-blue-600">
                Brands
              </Link>

              <Link href="/blog" className="hover:text-blue-600">
                Blog
              </Link>

              <Link href="/request-quote" className="hover:text-blue-600">
                RFQ
              </Link>

              <Link
                href="/request-quote"
                className="bg-blue-600 text-white px-5 py-3 rounded-xl font-black"
              >
                RFQ Now
              </Link>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}