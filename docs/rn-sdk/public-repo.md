# Public SDK repository

Target public repository:

```text
github.com/onborn/onborn-react-native
```

The private monorepo remains the source of truth for now:

```text
github.com/onborn/onborn
```

## Why split the public repo

The public SDK repository should contain only code that customers can inspect,
install, run, and file issues against:

- React Native SDK,
- standalone analytics package,
- runtime-safe SDK contracts,
- Expo example app,
- public SDK documentation,
- changelogs and release notes.

It must not contain backend, dashboard, builder, AI/MCP internals, template
management logic, provider credentials, or private contracts.

## Export flow

Clone or create the public repo locally:

```sh
mkdir -p ../onborn-react-native
cd ../onborn-react-native
git init
touch .onborn-public-sdk-repo
cd ../ONBORN
```

Export from the private monorepo:

```sh
yarn sdk:export-public-repo ../onborn-react-native
```

The export copies only the allowlisted SDK surface:

- `packages/sdk-contracts`
- `packages/analytics`
- `packages/rn-sdk`
- `packages/eslint-config`
- `packages/typescript-config`
- `docs/rn-sdk`
- `apps/demo-app` as `apps/example-expo`
- `scripts/sdk-release-check.sh`
- a generated public root `package.json`
- `turbo.json`
- a generated public root `README.md`

The script refuses to write into a non-empty directory unless it contains:

```text
.onborn-public-sdk-repo
```

This guard prevents accidentally syncing SDK output into the wrong folder.

## Public repo validation

After exporting:

```sh
cd ../onborn-react-native
yarn install
yarn sdk:release-check
```

Then inspect:

```sh
git status --short
```

Before publishing, confirm no private package names remain in source/package
surfaces:

```sh
rg "@onborn/contracts|apps/backend|apps/builder|apps/web|SUPABASE_SERVICE_ROLE|ANTHROPIC_API_KEY|OPENAI_API_KEY|GEMINI_API_KEY" packages apps package.json README.md
```

Expected result: no matches.

## Publishing order

Publish packages in dependency order:

1. `@onborn/sdk-contracts`
2. `@onborn/analytics`
3. `@onborn/rn-sdk`

Use npm credentials owned by the Onborn npm org/user, not a personal publish
token.

## Future direction

For beta, the private monorepo remains source of truth and the public repo is
exported during release.

If SDK development starts moving independently, promote
`onborn-react-native` to source of truth and consume published SDK packages back
inside the private monorepo/demo apps.
