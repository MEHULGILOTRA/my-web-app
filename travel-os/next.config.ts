import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives inside the SkyMiles marketing site's repo, which has its own
  // package-lock.json one directory up. Left alone, Turbopack infers that parent
  // as the workspace root and pulls the CRA site into the module graph. Pin it.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
