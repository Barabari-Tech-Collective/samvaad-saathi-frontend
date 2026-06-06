# AGENTS.md - Samvaad Saathi Frontend

## Project Overview

Next.js 16 app with React 19, TypeScript, and Tailwind CSS 4. A mobile-first AI-powered interview preparation platform.

---

## Commands

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint on all files

# Type checking (run manually if needed)
npx tsc --noEmit    # TypeScript type check
```

> **Note:** No test framework is configured. Avoid adding tests without discussing with the team first.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4 + daisyUI 5
- **State:** TanStack Query (server), React Context (global client)
- **HTTP:** Axios with custom hooks (`@/lib/api-config`)
- **Validation:** Zod
- **Analytics:** PostHog
- **Icons:** Heroicons
- **Fonts:** Google Fonts (Anek Devanagari, Noto Sans Devanagari, Orbitron)

---

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - no implicit any, strict null checks
- Use explicit types for function parameters and return values
- Use `interface` for object shapes, `type` for unions/primitives
- Prefer `unknown` over `any` for truly unknown data, narrow with type guards

### Imports

```typescript
// Order: 1) React, 2) External libs, 3) Internal aliases (@/), 4) Relative
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ENDPOINTS } from "@/lib/api-config";
import { cn } from "@/lib/utils";
import BottomNav from "./BottomNav";
```

- Use path alias `@/*` for internal imports (maps to `src/*`)
- Use named exports for utilities, default exports for components
- Never use barrel files - import directly from source files

### Naming Conventions

| Type             | Convention           | Example              |
| ---------------- | -------------------- | -------------------- |
| Components       | PascalCase           | `BottomNav.tsx`      |
| Hooks            | `use` + PascalCase   | `useAuth.tsx`        |
| Utilities        | camelCase            | `formatDate()`       |
| Constants        | SCREAMING_SNAKE_CASE | `MAX_RESUME_SIZE_MB` |
| Types/Interfaces | PascalCase           | `UserProfile`        |
| CSS classes      | kebab-case           | Tailwind classes     |

### Component Structure

```tsx
"use client"; // Include for any browser APIs or hooks

import { useEffect } from "react";

interface ComponentProps {
  title: string;
  className?: string;
}

export default function Component({ title, className = "" }: ComponentProps) {
  // Hooks first
  useEffect(() => {}, []);

  // Helper functions
  const handleClick = () => {};

  // Early returns for loading/error states
  if (!data) return <Skeleton />;

  return <div className={cn("base-classes", className)}>{title}</div>;
}
```

### File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout (metadata, providers)
│   ├── page.tsx           # Home page
│   └── [route]/          # Route-specific pages
├── components/            # Reusable UI components
│   ├── BottomNav.tsx      # Component files (PascalCase)
│   └── providers/        # React context providers
├── hooks/                 # Custom React hooks (useX naming)
├── lib/                   # Utilities and config
│   ├── api-config/       # API client, endpoints, config
│   ├── types/            # TypeScript interfaces
│   ├── posthog/          # Analytics utilities
│   └── utils.ts          # Shared utilities (cn, formatDate)
└── proxy.ts              # Proxy configuration
```

### Error Handling

```typescript
// API errors: use try/catch, track with PostHog, show toast
try {
  const res = await apiCall();
  return res.data;
} catch (error) {
  console.error("API error:", error);
  trackApiError(error, { endpoint: url });
  toast.error("Something went wrong");
  throw error;
}

// Request cancellation: check for CanceledError
if (error.name === "CanceledError" || error.code === "ERR_CANCELED") {
  return; // Silently handle
}

// React Context: throw error if used outside provider
if (!context) {
  throw new Error("useX must be used within XProvider");
}
```

### Tailwind CSS Patterns

```tsx
// Use clsx + tailwind-merge for conditional classes
import { cn } from "@/lib/utils";

<div className={cn(
  "base-styles",
  isActive && "active-styles",
  className  // Allow prop override
)}>

// Mobile-first breakpoints
<div className="w-full md:w-1/2 lg:w-1/3">

// Custom colors (defined in tailwind config)
<div className="bg-primary text-secondary">
```

### Next.js Patterns

```tsx
// Server Components: default, async, no "use client"
export default async function Page() {
  const data = await fetchData();
  return <Component data={data} />;
}

// Client Components: add "use client" at top
("use client");

// Server Actions: add "use server" at function level
async function submitAction(formData: FormData) {
  "use server";
  // Server-side logic
}
```

### Context Pattern

```tsx
// src/components/providers/auth-provider.tsx
"use client";

interface ContextType {
  value: Type | null;
  action: () => void;
}

const Context = createContext<ContextType | undefined>(undefined);

export function Provider({ children }: { children: React.ReactNode }) {
  // Provider logic with hooks
  const value = {
    /* ... */
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useContext() {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error("useContext must be used within ContextProvider");
  }
  return context;
}
```

---

## Environment Variables

Required `.env` variables (see `.env.example` or existing `.env`):

- `NEXT_PUBLIC_APP_URL` - Application URL
- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog API key
- `AUTH_BASE_URL` - Backend authentication service URL

---

## Key Libraries Reference

| Library                   | Usage                 | Import                                              |
| ------------------------- | --------------------- | --------------------------------------------------- |
| `@tanstack/react-query`   | Server state          | `useQuery`, `useMutation`                           |
| `react-cookie`            | Cookie access         | `useCookies(["token"])`                             |
| `react-hot-toast`         | Notifications         | `toast.success()`, `toast.error()`                  |
| `zod`                     | Validation            | `z.object({})`                                      |
| `axios`                   | HTTP (via api-config) | `createApiClient()`                                 |
| `@heroicons/react`        | Icons                 | `import { XIcon } from "@heroicons/react/24/solid"` |
| `clsx` + `tailwind-merge` | ClassName utility     | `cn()` from `@/lib/utils`                           |
| `dayjs`                   | Date formatting       | `dayjs().format("DD MMM, YYYY")`                    |

---

## Performance Notes

- No barrel imports - import directly from source files
- Use `dynamic` imports for heavy components (`next/dynamic`)
- Minimize props passed to client components (serialization overhead)
- Use `React.cache()` for deduplication in server components
- Check for SSR compatibility before using browser APIs (`typeof window !== "undefined"`)

---

## Code Review Checklist

- [ ] TypeScript strict mode passes (`tsc --noEmit`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No `console.log` in production code (use `console.error` for errors)
- [ ] All external browser APIs are client-side only
- [ ] Error states are handled and user feedback provided via toast
- [ ] Mobile-first responsive design implemented
- [ ] PostHog tracking added for new user interactions

<!-- NEXT-AGENTS-MD-START -->[Next.js Docs Index]|root: ./.next-docs|STOP. What you remember about Next.js is WRONG for this project. Always search docs and read before any task.|If docs missing, run this command first: npx @next/codemod agents-md --output AGENTS.md|01-app:{04-glossary.mdx}|01-app/01-getting-started:{01-installation.mdx,02-project-structure.mdx,03-layouts-and-pages.mdx,04-linking-and-navigating.mdx,05-server-and-client-components.mdx,06-cache-components.mdx,07-fetching-data.mdx,08-updating-data.mdx,09-caching-and-revalidating.mdx,10-error-handling.mdx,11-css.mdx,12-images.mdx,13-fonts.mdx,14-metadata-and-og-images.mdx,15-route-handlers.mdx,16-proxy.mdx,17-deploying.mdx,18-upgrading.mdx}|01-app/02-guides:{analytics.mdx,authentication.mdx,backend-for-frontend.mdx,caching.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,data-security.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,json-ld.mdx,lazy-loading.mdx,local-development.mdx,mcp.mdx,mdx.mdx,memory-usage.mdx,multi-tenant.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,prefetching.mdx,production-checklist.mdx,progressive-web-apps.mdx,public-static-pages.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,single-page-applications.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx,videos.mdx}|01-app/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|01-app/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|01-app/02-guides/upgrading:{codemods.mdx,version-14.mdx,version-15.mdx,version-16.mdx}|01-app/03-api-reference:{07-edge.mdx,08-turbopack.mdx}|01-app/03-api-reference/01-directives:{use-cache-private.mdx,use-cache-remote.mdx,use-cache.mdx,use-client.mdx,use-server.mdx}|01-app/03-api-reference/02-components:{font.mdx,form.mdx,image.mdx,link.mdx,script.mdx}|01-app/03-api-reference/03-file-conventions/01-metadata:{app-icons.mdx,manifest.mdx,opengraph-image.mdx,robots.mdx,sitemap.mdx}|01-app/03-api-reference/03-file-conventions:{default.mdx,dynamic-routes.mdx,error.mdx,forbidden.mdx,instrumentation-client.mdx,instrumentation.mdx,intercepting-routes.mdx,layout.mdx,loading.mdx,mdx-components.mdx,not-found.mdx,page.mdx,parallel-routes.mdx,proxy.mdx,public-folder.mdx,route-groups.mdx,route-segment-config.mdx,route.mdx,src-folder.mdx,template.mdx,unauthorized.mdx}|01-app/03-api-reference/04-functions:{after.mdx,cacheLife.mdx,cacheTag.mdx,connection.mdx,cookies.mdx,draft-mode.mdx,fetch.mdx,forbidden.mdx,generate-image-metadata.mdx,generate-metadata.mdx,generate-sitemaps.mdx,generate-static-params.mdx,generate-viewport.mdx,headers.mdx,image-response.mdx,next-request.mdx,next-response.mdx,not-found.mdx,permanentRedirect.mdx,redirect.mdx,refresh.mdx,revalidatePath.mdx,revalidateTag.mdx,unauthorized.mdx,unstable_cache.mdx,unstable_noStore.mdx,unstable_rethrow.mdx,updateTag.mdx,use-link-status.mdx,use-params.mdx,use-pathname.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,use-selected-layout-segment.mdx,use-selected-layout-segments.mdx,userAgent.mdx}|01-app/03-api-reference/05-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,appDir.mdx,assetPrefix.mdx,authInterrupts.mdx,basePath.mdx,browserDebugInfoInTerminal.mdx,cacheComponents.mdx,cacheHandlers.mdx,cacheLife.mdx,compress.mdx,crossOrigin.mdx,cssChunking.mdx,devIndicators.mdx,distDir.mdx,env.mdx,expireTime.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,htmlLimitedBots.mdx,httpAgentOptions.mdx,images.mdx,incrementalCacheHandlerPath.mdx,inlineCss.mdx,isolatedDevBuild.mdx,logging.mdx,mdxRs.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactCompiler.mdx,reactMaxHeadersLength.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,sassOptions.mdx,serverActions.mdx,serverComponentsHmrCache.mdx,serverExternalPackages.mdx,staleTimes.mdx,staticGeneration.mdx,taint.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,turbopackFileSystemCache.mdx,typedRoutes.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,viewTransition.mdx,webVitalsAttribution.mdx,webpack.mdx}|01-app/03-api-reference/05-config:{02-typescript.mdx,03-eslint.mdx}|01-app/03-api-reference/06-cli:{create-next-app.mdx,next.mdx}|02-pages/01-getting-started:{01-installation.mdx,02-project-structure.mdx,04-images.mdx,05-fonts.mdx,06-css.mdx,11-deploying.mdx}|02-pages/02-guides:{analytics.mdx,authentication.mdx,babel.mdx,ci-build-caching.mdx,content-security-policy.mdx,css-in-js.mdx,custom-server.mdx,debugging.mdx,draft-mode.mdx,environment-variables.mdx,forms.mdx,incremental-static-regeneration.mdx,instrumentation.mdx,internationalization.mdx,lazy-loading.mdx,mdx.mdx,multi-zones.mdx,open-telemetry.mdx,package-bundling.mdx,post-css.mdx,preview-mode.mdx,production-checklist.mdx,redirecting.mdx,sass.mdx,scripts.mdx,self-hosting.mdx,static-exports.mdx,tailwind-v3-css.mdx,third-party-libraries.mdx}|02-pages/02-guides/migrating:{app-router-migration.mdx,from-create-react-app.mdx,from-vite.mdx}|02-pages/02-guides/testing:{cypress.mdx,jest.mdx,playwright.mdx,vitest.mdx}|02-pages/02-guides/upgrading:{codemods.mdx,version-10.mdx,version-11.mdx,version-12.mdx,version-13.mdx,version-14.mdx,version-9.mdx}|02-pages/03-building-your-application/01-routing:{01-pages-and-layouts.mdx,02-dynamic-routes.mdx,03-linking-and-navigating.mdx,05-custom-app.mdx,06-custom-document.mdx,07-api-routes.mdx,08-custom-error.mdx}|02-pages/03-building-your-application/02-rendering:{01-server-side-rendering.mdx,02-static-site-generation.mdx,04-automatic-static-optimization.mdx,05-client-side-rendering.mdx}|02-pages/03-building-your-application/03-data-fetching:{01-get-static-props.mdx,02-get-static-paths.mdx,03-forms-and-mutations.mdx,03-get-server-side-props.mdx,05-client-side.mdx}|02-pages/03-building-your-application/06-configuring:{12-error-handling.mdx}|02-pages/04-api-reference:{06-edge.mdx,08-turbopack.mdx}|02-pages/04-api-reference/01-components:{font.mdx,form.mdx,head.mdx,image-legacy.mdx,image.mdx,link.mdx,script.mdx}|02-pages/04-api-reference/02-file-conventions:{instrumentation.mdx,proxy.mdx,public-folder.mdx,src-folder.mdx}|02-pages/04-api-reference/03-functions:{get-initial-props.mdx,get-server-side-props.mdx,get-static-paths.mdx,get-static-props.mdx,next-request.mdx,next-response.mdx,use-params.mdx,use-report-web-vitals.mdx,use-router.mdx,use-search-params.mdx,userAgent.mdx}|02-pages/04-api-reference/04-config/01-next-config-js:{adapterPath.mdx,allowedDevOrigins.mdx,assetPrefix.mdx,basePath.mdx,bundlePagesRouterDependencies.mdx,compress.mdx,crossOrigin.mdx,devIndicators.mdx,distDir.mdx,env.mdx,exportPathMap.mdx,generateBuildId.mdx,generateEtags.mdx,headers.mdx,httpAgentOptions.mdx,images.mdx,isolatedDevBuild.mdx,onDemandEntries.mdx,optimizePackageImports.mdx,output.mdx,pageExtensions.mdx,poweredByHeader.mdx,productionBrowserSourceMaps.mdx,proxyClientMaxBodySize.mdx,reactStrictMode.mdx,redirects.mdx,rewrites.mdx,serverExternalPackages.mdx,trailingSlash.mdx,transpilePackages.mdx,turbopack.mdx,typescript.mdx,urlImports.mdx,useLightningcss.mdx,webVitalsAttribution.mdx,webpack.mdx}|02-pages/04-api-reference/04-config:{01-typescript.mdx,02-eslint.mdx}|02-pages/04-api-reference/05-cli:{create-next-app.mdx,next.mdx}|03-architecture:{accessibility.mdx,fast-refresh.mdx,nextjs-compiler.mdx,supported-browsers.mdx}|04-community:{01-contribution-guide.mdx,02-rspack.mdx}<!-- NEXT-AGENTS-MD-END -->
