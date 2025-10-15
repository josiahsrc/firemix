# Firemix

Firemix is a collection of Firebase Firestore strategy wrappers that expose a
consistent, type-safe API across client, admin, and mixed (zone-aware)
environments.

## Packages

- `@firemix/core` – shared types, abstractions, and helpers used by every
  variant.
- `@firemix/client` – bindings for the browser Firebase SDK (`firebase`).
- `@firemix/admin` – bindings for the Firebase Admin SDK (`firebase-admin`).
- `@firemix/mixed` – bundles both strategies together and adds async-hook based
  zoning utilities so you can swap implementations per request.

Install only the packages you need:

```bash
npm install @firemix/client firebase
npm install @firemix/admin firebase-admin
npm install @firemix/mixed firebase firebase-admin
```

Each published package ships ESM output with TypeScript declarations. All
exports are tree-shakeable and marked as side-effect free.

## Quick Start

```ts
import { FiremixClient } from "@firemix/client";

const firemix = new FiremixClient();
await firemix.set(["users", "ada"], { name: "Ada" });
const result = await firemix.get(["users", "ada"]);

import { firemix, firemixSdkZone } from "@firemix/mixed";

await firemixSdkZone("admin", async () => {
  await firemix().delete(["tenants", "legacy"]);
});
```

## Local Development

- `npm install` – install dependencies across the workspace.
- `npm run build` – emit compiled artifacts to `packages/*/dist`.
- `npm test` – run the Jest suite for all packages.
- `npm run type-check` – validate TypeScript without emitting files.

Publishing individual packages can be done from their directory using
`npm publish --access public` once the `file:` workspace links are replaced with
version numbers.
