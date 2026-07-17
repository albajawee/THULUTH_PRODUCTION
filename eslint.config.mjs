import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // --- Downgraded to warn, deliberately. Both are TRACKED, not dismissed. ---
      // See SAAS_PLAN.md §5 (P2). Do not delete these without reading that section.

      // Fires on `if (!userId) { setLoading(false); return; }` in the realtime hooks, and on
      // `setLoading(true)` in reports/page.tsx. These are genuine smells (one extra render each),
      // but not bugs — no loops, no incorrect output. Fixing them properly means deriving loading
      // state instead of setting it, which is a rewrite of the same hooks that P2 rewrites anyway
      // (4 listeners -> 1, rollups, SSR). Doing it twice risks churn in money-handling code for
      // no behavioural gain. Fix in P2, then restore to "error".
      'react-hooks/set-state-in-effect': 'warn',

      // Fires on `document.cookie = ...` / `document.documentElement.dir = ...` inside an async
      // submit handler in settings/page.tsx. Mutating the DOM in an event handler is legitimate;
      // this rule is aimed at mutation during render. Treated as a false positive here, but kept
      // at "warn" rather than "off" so new occurrences stay visible for review.
      'react-hooks/immutability': 'warn',
    },
  },
])

export default eslintConfig
