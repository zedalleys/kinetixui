# Changesets

Adding a change:

```bash
pnpm changeset          # describe the change; pick affected packages + bump
git add .changeset && git commit
```

On merge to `main`, the release workflow opens a **Version Packages** PR that
applies the changesets and updates changelogs. Merging that PR publishes
`@kinetixui/tokens` and `@kinetixui/ui` to npm (needs the `NPM_TOKEN` repo secret).
