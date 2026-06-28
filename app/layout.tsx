import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const email = "sales@globalplcparts.com";
const whatsappNumber = "8613774696836";
const GA_ID = "G-LPS04SZVX7";

export const metadata: Metadata = {
  title: "GlobalPLCParts | Industrial Automation Parts Supplier",
  description:
    "GlobalPLCParts supplies PLC, DCS, HMI, controller and industrial automation spare parts worldwide.",
  verification: {
    google: "4F3xpyojabevBgIuU9zHRqhyIOCCNFBYEOh4i82K1S0",
  },
  icons: {
    icon: [
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/brand/favicon-192.png", sizes: "192x192", type: "image/png" }],
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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>

        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);
                t.async=1;
                t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];
                y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "xdhlm575ql");
          `}
        </Script>

        <div className="bg-slate-950 text-white text-sm">
          <div className="max-w-7xl mx-auto px-6 py-2 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <div className="flex flex-wrap gap-4">
              <a href={`mailto:${email}`} className="hover:text-blue-300">
                Email: {email}
              </a>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-green-300"
              >
                WhatsApp RFQ
              </a>
            </div>

            <div className="text-slate-300">
              Fast RFQ Reply · Worldwide Industrial Automation Parts Supply
            </div>
          </div>
        </div>

        <header className="bg-white/95 backdrop-blur border-b sticky top-0 z-50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
            <Link href="/" className="flex items-center">
              <Image
                src="/brand/logo-main.png"
                alt="GlobalPLCParts"
                width={260}
                height={86}
                priority
                className="h-14 w-auto object-contain"
              />
            </Link>

            <form action="/search" className="flex-1 max-w-2xl flex gap-2">
              <input
                name="q"
                placeholder="Search model number, brand, PLC, DCS..."
                className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />

              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black">
                Search
              </button>
            </form>

            <nav className="flex flex-wrap gap-5 text-sm font-bold text-slate-700 items-center">
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-black"
              >
                RFQ Now
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <footer className="bg-slate-950 text-white border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <Image
                src="/brand/logo-main-dark.png"
                alt="GlobalPLCParts"
                width={320}
                height={110}
                className="h-16 w-auto object-contain mb-5"
              />

              <p className="text-slate-300 max-w-xl leading-7">
                GlobalPLCParts supplies PLC, DCS, HMI, drive modules and
                industrial automation spare parts worldwide with fast RFQ support.
              </p>
            </div>

            <div>
              <h3 className="font-black mb-4">Quick Links</h3>
              <div className="grid gap-3 text-slate-300">
                <Link href="/products" className="hover:text-white">Products</Link>
                <Link href="/brands" className="hover:text-white">Brands</Link>
                <Link href="/blog" className="hover:text-white">Blog</Link>
                <Link href="/request-quote" className="hover:text-white">Request Quote</Link>
              </div>
            </div>

            <div>
              <h3 className="font-black mb-4">Contact</h3>
              <div className="grid gap-3 text-slate-300">
                <a href={`mailto:${email}`} className="hover:text-white">{email}</a>
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp RFQ
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-6 py-5 text-sm text-slate-400 flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
              <span>© {new Date().getFullYear()} GlobalPLCParts. All rights reserved.</span>
              <span>Powering Industrial Automation Worldwide</span>
            </div>
          </div>
        </footer>

        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
      </body>
    </html>
  );
}