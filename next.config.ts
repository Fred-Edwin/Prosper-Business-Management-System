import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // M2 3a: the Admin Orders (A3) and Canteen Derived Sales (A4) screens
      // merged into one tabbed /admin/sales screen.
      {
        source: "/admin/orders",
        destination: "/admin/sales",
        permanent: true,
      },
      {
        source: "/admin/canteen/derived-sales",
        destination: "/admin/sales?tab=derived",
        permanent: true,
      },
      // M3 S3: the Handovers reconciliation view is a tab of
      // /admin/financials (owner call), not a standalone route.
      {
        source: "/admin/handovers",
        destination: "/admin/financials?tab=handovers",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
