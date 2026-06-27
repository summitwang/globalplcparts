"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  trackEmail,
  trackEvent,
  trackRFQ,
  trackSearch,
  trackWhatsapp,
} from "@/lib/analytics";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedScroll = useRef<Set<number>>(new Set());

  useEffect(() => {
    const q = searchParams.get("q") || "";
    const page = searchParams.get("page") || "1";

    trackEvent("page_view_custom", {
      page_path: pathname,
      page_query: searchParams.toString(),
      page_number: page,
    });

    if (pathname.startsWith("/products/")) {
      trackEvent("view_product", {
        product_slug: pathname.replace("/products/", ""),
      });
    }

    if (pathname.startsWith("/brands/")) {
      trackEvent("view_brand", {
        brand_slug: pathname.replace("/brands/", ""),
      });
    }

    if (pathname.startsWith("/blog/")) {
      trackEvent("view_blog", {
        blog_slug: pathname.replace("/blog/", ""),
      });
    }

    if (pathname === "/search" && q) {
      trackSearch(q);
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    trackedScroll.current = new Set();

    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (docHeight <= 0) return;

      const percent = Math.round((scrollTop / docHeight) * 100);
      const marks = [25, 50, 75, 90];

      for (const mark of marks) {
        if (percent >= mark && !trackedScroll.current.has(mark)) {
          trackedScroll.current.add(mark);

          trackEvent("scroll_depth", {
            depth_percent: mark,
            page_path: window.location.pathname,
          });
        }
      }
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const link = target.closest("a") as HTMLAnchorElement | null;

      if (!link) return;

      const href = link.getAttribute("href") || "";

      if (href.includes("wa.me") || href.includes("whatsapp")) {
        trackWhatsapp();
      }

      if (href.startsWith("mailto:")) {
        trackEmail();
      }

      if (href.startsWith("/request-quote")) {
        trackEvent("click_rfq", {
          page_path: window.location.pathname,
          target_url: href,
        });
      }

      if (href.startsWith("/products/")) {
        trackEvent("click_product", {
          product_slug: href.replace("/products/", ""),
          page_path: window.location.pathname,
        });
      }

      if (href.startsWith("/brands/")) {
        trackEvent("click_brand", {
          brand_slug: href.replace("/brands/", ""),
          page_path: window.location.pathname,
        });
      }
    }

    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement;
      if (!form) return;

      const action = form.getAttribute("action") || "";
      const formData = new FormData(form);

      if (action.includes("/search")) {
        const q = String(formData.get("q") || "");
        if (q.trim()) {
          trackSearch(q.trim());
        }
      }

      if (
        action.includes("/request-quote") ||
        window.location.pathname.includes("/request-quote")
      ) {
        trackRFQ({
          page_path: window.location.pathname,
        });
      }
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  return null;
}