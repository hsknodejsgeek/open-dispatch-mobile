# Open Dispatch Mobile

The Driver / Field Agent companion app for Open Dispatch — an Expo Router (SDK 57) app for
drivers to see their assigned deliveries, update job status in the field, and check their
offline sync state. Built to pair with the Fastify backend in `../server`.

## Architecture highlights

- **Performance** — the assigned jobs feed (`(tabs)/index.tsx`) uses
  [`@shopify/flash-list`](https://shopify.github.io/flash-list/) instead of `FlatList`, with
  infinite-scroll pagination (`useInfiniteQuery`, 20 items/page) for smooth scrolling as the list
  grows.
- **Resilience** — offline-first caching via [`@tanstack/react-query`](https://tanstack.com/query)
  persisted to disk with [`react-native-mmkv`](https://github.com/mrousavy/react-native-mmkv)
  (`services/query-client.ts`). Cached data renders instantly on a cold start with no signal,
  then revalidates once connectivity returns. Connectivity itself is real —
  `@react-native-community/netinfo` is wired into TanStack Query's `onlineManager`, so a status
  update fired while offline is genuinely queued (paused, not errored) and resumes automatically
  when back online. The Sync & Diagnostics tab surfaces this queue, along with real API latency
  and cache-size metrics, not placeholder numbers.
- **Security** — JWT access/refresh tokens are isolated in `expo-secure-store` (iOS Keychain /
  Android Keystore), never in MMKV or AsyncStorage (`services/storage.ts`). The API client sends
  `X-Client-Type: mobile` and does a single-flight refresh-and-retry on 401
  (`services/api.ts`).

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the backend** (see `../server/server/README.md`), then seed a demo driver login:

   ```bash
   cd ../server/server
   npm run migrate
   npm run seed:mobile-driver
   ```

   This creates `driver@opendispatch.test` / `DriverPass123!` with a linked driver profile and a
   few sample deliveries. Full details in `../server/docs/mobile UI/seed-credentials.md`. The
   login screen pre-fills these credentials automatically in dev builds.

3. **Point the app at your backend** (optional): copy `.env.example` to `.env` and set
   `EXPO_PUBLIC_API_URL` if you're not using the default `localhost:3001` / `10.0.2.2:3001`
   (Android emulator) resolution — e.g. to test on a physical device, set it to your machine's
   LAN IP.

4. **Run a dev client build** — this app uses `react-native-mmkv`, a native module, so it will
   **not** run in plain Expo Go:

   ```bash
   npm run ios      # or
   npm run android
   ```

   `react-native-mmkv` is pinned to 2.x rather than the newer 3.x because 3.x requires the New
   Architecture (TurboModules), which this project's dev client isn't built with.

## Project structure

```
src/
├── app/
│   ├── _layout.tsx           # Root: providers (query, gesture handler, bottom sheet),
│   │                         # auth gate (SecureStore token check → (auth) vs (tabs))
│   ├── (auth)/login.tsx      # Driver sign-in
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Native bottom tab bar: Jobs / Sync / Profile
│   │   ├── index.tsx         # Assigned Jobs — FlashList, filters, search
│   │   ├── sync-status.tsx   # Sync & Diagnostics
│   │   └── profile.tsx       # Driver profile, today's summary, logout
│   └── job/[id].tsx          # Job detail + status action bottom sheet
├── components/
│   ├── job-card.tsx          # Assigned-jobs list item
│   └── status-sheet.tsx      # Reusable confirm-and-act bottom sheet
├── services/
│   ├── api.ts                 # axios client, JWT bearer + refresh interceptor, latency tracking
│   ├── auth-service.ts         # login/logout
│   ├── deliveries-service.ts   # list/get/patch-status deliveries
│   ├── user-service.ts         # GET /v1/auth/me
│   ├── storage.ts              # SecureStore (tokens) + MMKV (cache) wrapper
│   ├── query-client.ts         # TanStack QueryClient + MMKV persister + NetInfo online manager
│   ├── api-latency.ts          # rolling API round-trip-time samples
│   └── activity-log.ts         # MMKV-backed event log for the Sync screen's timeline
├── hooks/                     # use-jobs, use-job, use-assigned-jobs (infinite), use-me,
│                               # use-update-job-status (optimistic mutation)
├── mocks/jobs.json            # Fallback data so the app works standalone without a backend
├── constants/tokens.ts        # Design tokens (colors/spacing/typography) — plain StyleSheet,
│                               # no NativeWind/Tailwind
└── types/api.ts                # Shared types matching the server's typebox schemas
```

## Known gaps vs. the design wireframes

The wireframes in `../mobile_wireframes` assume some data the backend doesn't have (customer
name/phone, package weight/dimensions, distance, ETA, a driver photo/display name). Rather than
fabricate that data, each screen shows only what's real and drops what isn't, with a comment at
the top of the relevant file explaining the specific reconciliation. Also missing on purpose:
biometric login, dark mode (no dark palette exists in `tokens.ts`), and location tracking (no
location library integrated). See `docs/MOBILE_IMPLEMENTATION_PHASES.md` for the full phase-by-phase
build log and every reconciliation decision.

One cosmetic rough edge: the bottom tab bar reuses the template's two starter icons
(`assets/images/tabIcons/{home,explore}.png`) across three tabs — Sync and Profile currently
share the same icon. No icon library (e.g. Lucide, as `design.md` specifies) is installed yet;
swapping in a proper icon set is a good next step.

## Scripts

- `npm run ios` / `npm run android` — build and run the dev client (also aliased as `build:ios`
  / `build:android`)
- `npm start` — start the Metro bundler
- `npm run lint` — ESLint
- `npm run reset-project` — Expo's built-in "start fresh" script (unrelated to this app's own
  code, inherited from the create-expo-app template)
