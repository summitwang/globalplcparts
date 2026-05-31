export const brandSeo: Record<
  string,
  {
    intro: string;
    keywords: string[];
    faq: {
      q: string;
      a: string;
    }[];
  }
> = {
  "allen-bradley": {
    intro:
      "Allen Bradley is one of the world's leading industrial automation brands. GlobalPLCParts supplies Allen Bradley PLCs, ControlLogix modules, CompactLogix controllers, HMI panels, drives, power supplies, and obsolete automation components worldwide.",

    keywords: [
      "Allen Bradley PLC Supplier",
      "Allen Bradley Spare Parts",
      "Allen Bradley Distributor",
      "Allen Bradley Automation Components",
      "Allen Bradley Inventory"
    ],

    faq: [
      {
        q: "Do you provide obsolete Allen Bradley parts?",
        a: "Yes. We specialize in sourcing obsolete and hard-to-find Allen Bradley automation components."
      },
      {
        q: "Do you ship worldwide?",
        a: "Yes. We provide international shipping to over 100 countries."
      },
      {
        q: "Can I request a quotation?",
        a: "Yes. Submit an RFQ and our sales team will respond within 24 hours."
      }
    ]
  }
};