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
    ];
  },
};

export default nextConfig;
