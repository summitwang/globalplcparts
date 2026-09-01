export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", eventName, params);
  window.clarity?.("event", eventName);
}

export function trackSearch(searchTerm: string) {
  trackEvent("site_search", {
    search_term: searchTerm,
  });
}

export function trackRFQ(params: AnalyticsParams = {}) {
  trackEvent("generate_lead", {
    lead_type: "rfq",
    ...params,
  });
}

export function trackWhatsapp() {
  trackEvent("click_whatsapp", {
    contact_method: "whatsapp",
  });
}

export function trackEmail() {
  trackEvent("click_email", {
    contact_method: "email",
  });
}
