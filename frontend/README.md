# Etrog ERP — Frontend

React SPA for the Etrog Trade Management Platform. Hebrew RTL UI with bilingual support (he/en).

## Tech Stack

- **Framework**: React 18 + Vite 5 (TypeScript)
- **State**: Redux Toolkit
- **Routing**: React Router v7
- **Styling**: CSS Modules + design tokens
- **Exports**: ExcelJS, browser print

## Prerequisites

- Node.js 22+
- npm
- Backend running on port 3000

## Setup

```bash
cd frontend
npm install
```

## Running

```bash
npm run dev
```

Dev server starts on **http://localhost:5173**. API calls to `/api/*` are proxied automatically to `http://localhost:3000` — no extra config needed.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview production build locally |

## Project Structure

```
src/
├── app/
│   ├── layout/AppShell.tsx        # Root layout wrapper
│   └── routes/                    # One component per page route
├── components/
│   ├── navigation/                # TopBar, Sidebar, ProfileMenu
│   └── ui/                        # Shared generic components
├── features/                      # Domain feature modules
│   ├── auth/
│   ├── home/
│   ├── harvest/
│   ├── customers/
│   ├── traders/
│   ├── inventory/
│   ├── shipments/
│   ├── workers/
│   ├── payments/
│   ├── messages/
│   ├── settings/
│   └── profile/
├── store/                         # Redux store + slices
├── services/                      # API clients + utilities
├── hooks/                         # Shared custom hooks
├── styles/                        # design-tokens.css + global CSS
├── types/                         # Shared TypeScript types
└── utils/                         # Pure utility helpers
```

## Feature Module Structure

Each feature is self-contained:

```
features/<domain>/
  <Domain>Page.tsx         # Page component
  <domain>.types.ts        # TypeScript types
  i18n.ts / i18n.en.ts / i18n.he.ts
  components/
    forms/                 # Form modals
    shared/                # Shared sub-components
    styles/                # Scoped CSS modules
  hooks/
    form/                  # Form state & submission hooks
    page/                  # Page-level control hooks
  utils/                   # Feature-specific helpers
```

## State Management

Redux slices in `store/`:

| Slice | Contents |
|---|---|
| `seasonsSlice` | Season list + active season |
| `fieldsSlice` | Field list |
| `tradersSlice` | Trader list |
| `customersSlice` | Customer list |
| `customerCategoriesSlice` | Customer category pricing |
| `globalFiltersSlice` | Active season/field filters (shared across pages) |

## API Services

Every domain has a dedicated service file in `services/` (e.g. `harvestsApi.ts`, `shipmentsApi.ts`). All HTTP calls go through `apiClient.ts` which attaches the JWT token and emits toast notifications on errors.

## Theming

Primary color, accent color, and dark mode are persisted in `localStorage` and applied as CSS variables at boot. Design tokens are defined in `styles/design-tokens.css`.

## Internationalization

Each feature has `i18n.en.ts` and `i18n.he.ts` string files, unified via `i18n.ts`. The UI defaults to Hebrew (RTL).

## Docker

```bash
docker build -t etrog-erp-frontend ./frontend
docker run -p 80:80 -e BACKEND_URL=http://your-backend:3000 etrog-erp-frontend
```
