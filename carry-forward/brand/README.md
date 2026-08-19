# Brand assets — carried forward

Everything here derives from `prosper-hotel-logo.jpeg`. Keep that file;
the rest can be regenerated.

| File | Size | Used for |
|---|---|---|
| `prosper-hotel-logo.jpeg` | source | The original. Generate everything from this |
| `icon-192.png` | 192×192 | PWA manifest |
| `icon-512.png` | 512×512 | PWA manifest, and the favicon |
| `apple-icon.png` | 180×180 | iOS home-screen icon |
| `generate-icons.mjs` | — | Regenerates all of the above |

## Regenerating

Needs `sharp` (`pnpm add -D sharp`), the logo at `public/prosper-hotel-logo.jpeg`,
then `node scripts/generate-icons.mjs`. Adjust the `targets` array for
different sizes.

## Where Next.js expects them

App-router file conventions — no `<link>` tags needed, Next serves them
from the filename:

- `src/app/icon.png`       → favicon (512×512 works fine)
- `src/app/apple-icon.png` → iOS
- `public/icon-192.png`, `public/icon-512.png` → referenced by manifest.ts

## Theme colours from the old manifest

- `theme_color`:      `#1b002b`  (deep purple)
- `background_color`: `#ffffff`

The old manifest.ts, for reference:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prosper Hotel",
    short_name: "Prosper Hotel",
    description: "Stock, sales and cash across both locations.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1b002b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```
