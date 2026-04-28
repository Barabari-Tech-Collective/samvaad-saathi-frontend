# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Samvaad Saathi** is an AI-powered interview preparation platform built with Next.js 16, React 19, and TailwindCSS + DaisyUI. The app provides voice-based interview practice, real-time feedback, and detailed performance analytics for job seekers in India.

## Essential Commands

```bash
# Development
npm run dev        # Start dev server at http://localhost:3000
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint

# Git workflow
git status
git add .
git commit -m "message"
git push
```

## Architecture Overview

### Route Structure

The app uses Next.js App Router with route groups:

- **`(protected)/`** - Authenticated routes (requires token cookie)
  - All pages require authentication via middleware
  - Automatically redirects unauthenticated users to `/auth/signup`
  - Layout includes TopNav and BottomNav (hidden on `/onboarding` and `/interview`)

- **`auth/`** - Public authentication routes
  - Users with token are redirected to `/home`

### Key Routes

- `/home` - Dashboard with recent interviews carousel and "Get Started" CTA
- `/interview-start` - Interview setup (role, difficulty, resume toggle)
- `/interview` - Main interview interface (voice recording, question display)
- `/interview-completed` - Post-interview completion screen
- `/report-summary` - Detailed performance report with analytics
- `/history` - Complete/incomplete interview history with tabs
- `/profile` - User profile management
- `/onboarding` - Multi-step onboarding flow (education, profile pic, role setup)
- `/control-your-pace` - Pacing practice feature with levels
- `/pronunciation-practice` - Pronunciation training module

### Authentication Flow

1. **Middleware** (`src/proxy.ts`): Intercepts all routes, checks for `token` cookie
2. **AuthProvider** (`src/components/providers/auth-provider.tsx`):
   - Fetches user profile via `/me` endpoint using `react-query`
   - Manages sign-in/sign-out with AWS Cognito
   - Auto-redirects non-onboarded users to `/onboarding`
   - Integrates with PostHog for user identification
3. **Token Management**: Stored in cookies (`token`, `refresh_token`)

### API Architecture

Custom API client built on Axios + TanStack Query:

**Location**: `src/lib/api-config/`

- **`client.ts`**: Creates hook-based API client with `useQuery` and `useMutation` wrappers
- **`config.ts`**: Axios instance configuration, base URLs, interceptors
- **`endpoints.ts`**: Centralized endpoint definitions (v1 and v2)
- **`index.ts`**: Exports `apiClient` configured for `APIService.AUTH`

**Key Features**:
- Automatic token injection from cookies
- Built-in error tracking via PostHog (`trackApiError`)
- Success/error toast notifications
- Query invalidation on mutations
- Request cancellation support

**Usage Pattern**:
```typescript
const apiClient = createApiClient(APIService.INTERVIEWS);
const { data, isLoading } = apiClient.useQuery({ key: [...], url: "..." });
const { mutate, loading } = apiClient.useMutation({ url: "...", method: "post" });
```

### State Management

- **React Query** (`@tanstack/react-query`) for server state
- **Context Providers**:
  - `AuthProvider` - User authentication state
  - `AppProvider` - React Query client wrapper
  - `AnalyticsProvider` - PostHog initialization
  - `LimitedToaster` - Custom toast notification manager (max 3 toasts)
- **SessionStorage/LocalStorage**: Interview session data (`src/lib/interview-session-storage.ts`)

### Analytics Integration

**PostHog** is fully integrated for product analytics:

- **Location**: `src/lib/posthog/`
- **Key Functions**:
  - `identifyUser()` - Identify authenticated users
  - `trackEvent()` - Track custom events
  - `trackButtonClick()` - Track button interactions
  - `trackApiError()` - Automatically track API failures
  - **Auto-instrumentation**: All API errors are tracked via `createApiClient`
- **Usage**: Import tracking functions from `@/lib/posthog/tracking.utils`
- **Events**: Defined in `src/lib/posthog/events.ts` (use constants, not hardcoded strings)

### Styling System

- **TailwindCSS** (v4.1.13) with DaisyUI (v5.1.13) components
- **Mobile-first design** - Optimized for mobile screens
- **Custom Fonts**:
  - Noto Sans Devanagari (primary Hindi support)
  - Anek Devanagari (secondary Hindi font)
  - Orbitron (accent/display font)
- **Theme**: Light theme only (`data-theme="light"`)
- **CSS Variables**: Defined in `src/app/globals.css`

### Interview Session Flow

1. **Setup** (`/interview-start`) → Select role, difficulty, upload resume
2. **Start** → Create interview via `ENDPOINTS.INTERVIEWS.CREATE`
3. **Generate Questions** → `ENDPOINTS.INTERVIEWS.GENERATE_QUESTIONS`
4. **Interview Loop** (`/interview`):
   - Display question
   - Record audio answer (uses `useMicPermission`, `useTextToSpeech` hooks)
   - Submit via `ENDPOINTS.INTERVIEWS.QUESTION_ATTEMPTS`
   - Repeat for all questions
5. **Complete** → `ENDPOINTS.INTERVIEWS.COMPLETE`
6. **Analysis** → Generate report via `ENDPOINTS.ANALYSIS.GENERATE_SUMMARY_REPORT`
7. **View Report** (`/report-summary`)

### Custom Hooks

- **`useAuth`** - Access authentication state (from `AuthProvider`)
- **`useMicPermission`** (`src/hooks/useMicPermission.tsx`) - Handle microphone permissions
- **`useTextToSpeech`** (`src/hooks/useTextToSpeech.tsx`) - TTS for question playback
- **`useMediaQuery`** (`src/hooks/useMediaQuery.tsx`) - Responsive breakpoints

### Utilities

- **`src/lib/audio-utils.ts`** - Audio recording/processing utilities
- **`src/lib/token-utils.ts`** - Cookie-based token management
- **`src/lib/utils.ts`** - General utilities (e.g., `getInitials()`)
- **`src/lib/constants.ts`** - App-wide constants

## Code Conventions

### File Structure
- Use `page.tsx` for route pages
- Co-locate components in `_components/` subdirectories within route folders
- Shared components live in `src/components/`
- All TypeScript (`.tsx`/`.ts`), no JavaScript files

### Import Aliases
- Use `@/` alias for imports from `src/` (configured in `tsconfig.json`)
- Example: `import { useAuth } from "@/components/providers/auth-provider"`

### API Endpoints
- Always use constants from `ENDPOINTS` or `ENDPOINTS_V2` (never hardcode URLs)
- V2 endpoints are newer and preferred for new features

### Analytics
- Track all user interactions using PostHog utilities
- Use event constants from `src/lib/posthog/events.ts`
- API errors are automatically tracked

### Component Patterns
- Prefer `"use client"` directives for interactive components
- Use DaisyUI classes for UI components (buttons, cards, modals)
- Mobile-first responsive design

### Error Handling
- API errors show toast notifications via `react-hot-toast`
- Use `successMessage` and `errorMessage` in `useMutation` options
- PostHog tracks all errors automatically

## Environment Variables

Required environment variables (not in repo):
- `NEXT_PUBLIC_APP_URL` - App base URL (defaults to production URL)
- `GOOGLE_SITE_VERIFICATION` - Google Search Console verification
- PostHog configuration (injected via `AnalyticsProvider`)

## Important Notes

- **Authentication is cookie-based** - Token stored in `token` cookie, managed by middleware
- **Onboarding is enforced** - Non-onboarded users are redirected to `/onboarding`
- **Mobile-first** - All designs prioritize mobile experience
- **Hindi + English** - App supports both languages (`lang="hi"` in HTML)
- **Interview state** - Questions stored in sessionStorage during interview
- **Resume support** - Optional resume upload for personalized questions
- **Voice-first** - Primary interaction is voice recording for answers

## Testing User Flows

When testing features:
1. Ensure user is authenticated (check for `token` cookie)
2. Verify PostHog events are firing correctly
3. Test mobile viewport (primary target)
4. Check interview session persistence in sessionStorage
5. Verify API error handling shows appropriate toasts
