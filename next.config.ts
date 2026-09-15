import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Resolve missing records before sending headers, including non-bot requests.
  htmlLimitedBots: /.*/,
  outputFileTracingIncludes: { '/*': ['./data/products.json'] },
  async headers() {
    return ['/admin/:path*', '/api/:path*', '/search', '/internal/:path*', '/tools/:path*', '/scraper/:path*'].map(source => ({
      source, headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    }));
  },
};

export default nextConfig;
