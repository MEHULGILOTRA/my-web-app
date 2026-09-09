import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * The customer-facing half of this app must never be able to reach the admin
 * database client. `src/lib/db/admin.ts` authenticates as a role that can read
 * supplier costs and margins; `src/lib/db/portal.ts` authenticates as
 * `portal_reader`, which holds no grants on any base table.
 *
 * Route groups are only a naming convention — `(portal)` and `(admin)` compile
 * into the same module graph, and nothing in the language stops a portal page
 * importing the admin client. This rule turns that mistake into a build error
 * instead of a leak nobody notices in review.
 */
const restrictedAdminImports = {
  patterns: [
    {
      group: [
        "@/lib/db/admin",
        "@/lib/admin",
        "@/lib/admin/**",
        "**/lib/db/admin",
        "**/lib/admin/**",
      ],
      message:
        "Customer-facing code must not import admin database access. Use '@/lib/db/portal' — it can only read portal_* views, which physically lack cost, supplier and margin columns.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  {
    name: "skymiles/portal-admin-boundary",
    files: [
      "src/app/\\(portal\\)/**/*.{ts,tsx}",
      "src/lib/portal/**/*.{ts,tsx}",
      "src/components/portal/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": ["error", restrictedAdminImports],
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
