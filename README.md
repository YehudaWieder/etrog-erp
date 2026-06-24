# Etrog ERP — Backend

REST API for the Etrog Trade Management Platform. Built with NestJS, PostgreSQL, and Prisma ORM.

## Tech Stack

- **Framework**: NestJS v11 (TypeScript)
- **Database**: PostgreSQL via Prisma ORM v7
- **Auth**: JWT + Passport
- **Docs**: Swagger (`/api/docs`)

## Prerequisites

- Node.js 22+
- PostgreSQL instance
- npm

## Setup

```bash
npm install
```

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/etrog_erp?schema=public
JWT_SECRET=your-long-random-secret
JWT_EXPIRES_IN=1d
```

Run database migrations:

```bash
npx prisma migrate dev
```

## Running

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The server starts on **port 3000**. API prefix: `/api`. Swagger UI: `http://localhost:3000/api/docs`.

## Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Watch mode dev server |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled build |
| `npm run lint` | ESLint with auto-fix |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end tests |
| `npx prisma migrate dev` | Apply DB migrations |
| `npx prisma studio` | Open Prisma DB GUI |

## Project Structure

```
src/
├── auth/               # JWT authentication (login, token validation)
├── authorization/      # Guards, @Public / @Roles decorators
├── users/              # User management
├── seasons/            # Season (year) — multi-tenancy key
├── partners/           # Traders & Customers
├── categories/         # Trader & Customer categories with pricing
├── harvest/            # Field harvests & quality classifications
├── inventory/          # Trader stock & customer allocations
├── shipments/          # Shipments → Boxes → Items hierarchy
├── system-config/      # Fields, system settings, default categories
├── dashboard/          # Analytics & aggregations
├── messages/           # Inter-user messaging
└── prisma/             # PrismaService (global DB singleton)
```

## Authentication

All routes are protected by JWT by default. Mark public routes with `@Public()`. Role-based access uses `@Roles(...)`. Worker accounts are restricted to a limited set of routes defined in `authorization/constants/worker-routes.constants.ts`.

## Docker

```bash
docker build -t etrog-erp-backend .
docker run -p 3000:3000 --env-file .env etrog-erp-backend
```
