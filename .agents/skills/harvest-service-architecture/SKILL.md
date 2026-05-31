---
name: harvest-service-architecture
description: Reusable rules and workflow for adding or refactoring feature services in a clean structure (services/utils/hooks/components) with safe imports and green build.
---

# Feature Service Architecture Skill

Use this skill whenever adding a new service or refactoring logic in any feature under frontend/src/features.

## Scope

- Primary scope: `frontend/src/features/<feature-name>`
- Works for all feature modules (harvest, inventory, messages, shipments, etc.)
- Keep each feature internally consistent with this structure

## Locked Structure

Keep this structure as the default:

```txt
frontend/src/features/<feature-name>/
  <Feature>Page.tsx (or feature entry file)
  i18n.ts
  <feature>Page.types.ts (or types.ts)
  components/
  hooks/
  services/
  utils/
```

### Folder Responsibility

- `components/`: UI only (rendering, composition, local UI behavior)
- `hooks/`: orchestration and stateful flow (data loading, user actions, derived state)
- `services/`: feature-level business services and export/format/print services
- `utils/`: pure helpers, parsing, constants, payload builders
- `<feature>Page.types.ts` or `types.ts`: shared feature contracts and type aliases
- `i18n.ts`: feature translations only

## Naming Rules

- Service file: `*.service.ts`
- Pure helper file: `*.util.ts`
- Hook file: `use*.ts` or `use*.tsx`
- Component file: `PascalCase.tsx`
- Avoid generic names like `helpers.ts` or `misc.ts`

## Import Rules (Critical)

- Use relative imports within feature folders.
- Reuse shared contracts from the feature types file (`<feature>Page.types.ts` or `types.ts`).
- Reuse shared helpers from `utils/<feature>Page.utils.ts` (or `utils/index.ts`) when possible.
- Never duplicate existing utility logic in a new file.
- When moving files, update all import depths immediately.

## Service Extraction Rules

When extracting logic from the feature page or hooks/components:

1. Extract one concern at a time.
2. Keep existing behavior unchanged.
3. Keep function signatures explicit and typed.
4. Return plain data structures from services (no UI nodes).
5. Keep side effects in hooks, not in utility functions.

## Hebrew Text Safety

- Do not run bulk rewrite scripts that resave many files at once.
- Prefer targeted edits to avoid text encoding corruption.
- If Hebrew strings are touched, validate they remain readable.

## New Service Checklist

Before finishing:

1. File is placed in `services/` or `utils/` correctly.
2. Types are imported from shared feature types when relevant.
3. No duplicate business logic remains in the feature entry page/component.
4. Imports are clean and minimal.
5. Build passes with `npm run build` in `frontend/`.

## Definition of Done

A feature service refactor is complete only if:

1. Architecture matches this structure.
2. TypeScript build is green.
3. No import-path errors remain.
4. No Hebrew mojibake/corrupted literals were introduced.
5. Existing user flows in that feature still work.

## Harvest Profile (Reference Implementation)

Use this mapping when the feature is Harvest:

```txt
frontend/src/features/harvest/
  HarvestPage.tsx
  i18n.ts
  harvestPage.types.ts
  components/
  hooks/
  services/
  utils/
```

Harvest-specific helpers and types stay in:
- `services/*`
- `utils/harvestPage.utils.ts`
- `harvestPage.types.ts`
