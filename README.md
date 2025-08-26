# Smart TODO + Learning + Admin Assignments (Firebase + Hostinger)

A production-ready SPA built with React + TypeScript + Vite, Tailwind CSS, and Firebase (Auth, Firestore, Functions, FCM). Deployed to Hostinger static hosting; Firebase is the backend.

## Features
- Personal tasks CRUD with date-wise tabs (Today, Upcoming, Overdue, Completed)
- Admin-assigned tasks with secure status updates via Cloud Function
- In-app notifications and optional web push via FCM
- Learning journal per day with weekly summary
- Admin panel: user management and task assignment

## Tech
- React 18 + Vite + TS, Tailwind CSS, React Router, date-fns, zod
- Firebase v10 modular SDK: Auth, Firestore, Functions, FCM
- Cloud Functions (Node 20, TypeScript) with Admin SDK
- Optional PWA shell with FCM service worker

## Monorepo
- Root workspace managed via pnpm workspaces
- `web/` Vite SPA
- `functions/` Firebase Cloud Functions

## Setup
1. Clone and install deps
```bash
pnpm i
```
2. Create Firebase project and enable:
   - Auth (Email/Password)
   - Firestore
   - Cloud Functions
   - Cloud Messaging (FCM)
3. Create web config `.env` in project root (build-time):
```bash
cp .env.example .env
# fill VITE_FIREBASE_* values from Firebase console
```
4. Initialize Firebase locally (optional):
```bash
firebase login
firebase use <your-project-id>
```
5. Deploy Firestore rules and indexes:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Functions
- Configure optional email env vars (`EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`).
- Build and deploy:
```bash
pnpm -w functions:build
firebase deploy --only functions
```

## Web (local dev)
```bash
pnpm -w dev
```

## Build
```bash
pnpm -w build
```
The production build is output to `web/dist/`.

## Hostinger deploy
- Upload contents of `web/dist/` to `public_html/`
- Ensure `web/public/.htaccess` is also present in `public_html/` for SPA routing

## Admin role setup
- Sign in as an initial user, then from console grant yourself admin via callable `setUserRole` once deployed.
- On login, the app refreshes ID token to receive `role` claim.

## Firestore Rules
See `firestore.rules` in repo. Client must use callable to update assigned task status.

## Indexes
See `firestore.indexes.json`.

## Testing
- Minimal Playwright E2E setup included under `web/`. Run:
```bash
pnpm -w test:e2e
```

## Acceptance checks
- Personal task CRUD, sorting, realtime updates
- Assigned tasks: admin assignment, assignee status-only via callable, admin notifications
- Learning journal: daily entries and weekly summary
- Admin user management: create user; role reflected after token refresh
- Security: non-admin cannot alter assigned tasks directly
- Hostinger SPA routing works with `.htaccess`
- FCM push works foreground/background; in-app always works

## Environment
- Web: `VITE_FIREBASE_*`
- Functions: `EMAIL_PROVIDER`, `EMAIL_API_KEY`, `EMAIL_FROM`, `APP_BASE_URL`

## Notes
- Modular Firebase SDK imports
- All writes set `updatedAt = serverTimestamp()`
- Allowed status transitions: `todo -> in_progress -> done` or `todo -> done`
- Unsubscribe Firestore listeners on unmount
- Deduplicate FCM tokens per user