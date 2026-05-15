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
