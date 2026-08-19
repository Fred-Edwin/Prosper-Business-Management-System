import type { MetadataRoute } from "next";

// Icons carried forward from a prior build (carry-forward/brand/README.md)
// as a functional placeholder — real branding is a Design Sprint decision,
// not made here.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prosper",
    short_name: "Prosper",
    description: "Stock, sales, and cash across Restaurant, Canteen, and Store.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
