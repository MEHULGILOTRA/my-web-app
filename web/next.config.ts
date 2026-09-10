import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * This app is nested inside the marketing repo, which has its own
   * package-lock.json one directory up (the CRA site) and a sibling Next app
   * in travel-os. Left alone, Turbopack infers the parent as the workspace
   * root and pulls the CRA site into the module graph. Pinning it is the fix
   * already proven in travel-os/next.config.ts — do not re-solve it.
   */
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },

  /**
   * Cache headers live here rather than in vercel.json. The root vercel.json
   * uses the legacy `builds` + `routes` schema, where `routes` cannot coexist
   * with `headers` — and once the Vercel project's Root Directory points at
   * `web`, that file is never read at all.
   */
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  images: {
    // Derivatives are pre-generated and committed, so the source files are
    // already the right size. Pointing next/image at a 6000x3376 original
    // costs seconds on first request and bills per source transform.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
