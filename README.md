# Firemix

Firemix is a collection of Firebase Firestore strategy wrappers that expose a
consistent, type-safe API across client, admin, and mixed (zone-aware) environments.

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

## Quick start

It's helpful to share types between client SDKs and admin SDKs. However, this becomes difficult when a type needs to use a timestamp, you're kind of stuck on either using a generic parameter, forking the type and having one for the client and one for the admin. Firemix is a wrapper that basically makes everything SDK agnostic.

This also means Firemix exposes a unified API between the client SDK and the admin SDK.

```ts
type User = {
	name: string;
	createdAt: FiremixTimestamp; // works in both client and admin
};

// works for client
firemix("client").set<User>(["users", "ada"], {
	name: "Ada",
	createdAt: firemix("client").now(),
});

// works for admin
firemix("admin").set<User>(["users", "ada"], {
	name: "Ada",
	createdAt: firemix("admin").now(),
});

// use zones to avoid passing the sdk everywhere
firemixSdkZone("client", async () => {
	await firemix().set<User>(["users", "ada"], {
		name: "Ada",
		createdAt: firemix().now(), // uses the client sdk from the zone
	});
});
```

## Local development

- `npm install` – install dependencies across the workspace.
- `npm run build` – emit compiled artifacts to `packages/*/dist`.
- `npm test` – run the Jest suite for all packages.
- `npm run type-check` – validate TypeScript without emitting files.

---

keywords: firebase, firestore, typescript, typesafe, wrapper, admin, client, sdk, strategy, zone, async-hooks
