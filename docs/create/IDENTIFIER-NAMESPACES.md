# Identifier namespaces

KinetixUI has six identifier spaces, and two of them collide on one word. This is the decision that
separates them, what enforces it, and what it deliberately leaves alone.

## The collision

`commerce` is a business domain — an industry a product serves — canonical in
`docs/business-capabilities.json`. `Commerce` is a block category — a shelf in the block filter —
canonical in `blocks.manifest.json`. They are enforced by two scripts that do not know about each
other, and before this slice nothing in the repository declared the relationship between them.

That is not cosmetic. Create asks a reader to choose an industry and then to search and add a block.
Those two steps reach the two different `commerce`s, so without a resolution a domain filter and a
category filter would silently behave as if they were one facet.

## The resolution

Prefix every reference, keep both names, and write the relationship down.

| Identifier space | Prefix | Canonical in | Example |
|---|---|---|---|
| Business domain | `domain:` | `docs/business-capabilities.json` → `discovery.domains` | `domain:commerce` |
| Capability group | `capability:` | → `discovery.capabilities` | `capability:transactions` |
| Capability family | `family:` | → `families` | `family:D` |
| Block category | `block-category:` | `blocks.manifest.json` → `categories` | `block-category:commerce` |
| Block | `block:` | `blocks.manifest.json` → `blocks` | `block:order-summary` |
| Component | `component:` | `components.manifest.json` → `components` | `component:PriceBreakdown` |

A component is written in PascalCase and stored under its kebab slug; the resolver applies the same
`kebab` rule `scripts/business-discovery.mjs` uses, so `component:InputOTP` resolves to `input-otp`.

### Four rules

1. **Neither name is renamed.** Commerce stays the domain title and stays the block category.
   Renaming a reader-visible category to dodge an internal ambiguity is the wrong trade.
2. **The mapping is declared, never inferred.** `discovery.blockCategoryDomains` states which domains
   each block category *may* serve. Equal names do not imply a mapping: `block-category:commerce` →
   `domain:commerce` is written out, and the five neutral categories are written out as `[]` too. An
   empty list means **domain-neutral** — the category serves any industry and reaches a specific one
   only through the capability rows its blocks are cited by, which is the rule a domain-neutral
   family already follows. It does not mean the category serves nothing.
3. **A gate, not a convention.** `pnpm check:taxonomy-namespaces` fails when a category has no entry,
   when an entry names a category that does not exist, when either side of the map is unprefixed,
   when a prefixed identifier names something the canonical files do not define, when a domain cites
   no capability family, and when a declared category → domain relationship is one no block in that
   category actually reaches in the derived `discovery-index.json`. Eight negative controls prove
   each of those can fail; `--list-negatives` lists them.
4. **Create's industry picker offers domains only.** Block categories are a filter *within* block
   search, labelled "category", never offered as an industry.

## What this does not change

Fields that are **positionally typed** keep their bare ids: `discovery.workflows[].domain` can only
hold a domain, and `discovery.domains[].families` can only hold family ids. There is no ambiguity to
remove there, and prefixing them would churn every consumer and every generated artifact for no
property gained. The namespace requirement applies where a field is **polymorphic** — a position that
accepts more than one identifier space — which today means the `blockCategoryDomains` map and a
stored Create document's `domain` and node `ref`.

This is narrower than step 2 of `/mnt/project-files/create-c0/05-taxonomy-migration.md`, which asked
for prefixes on "every internal reference that is currently ambiguous". Those are the ambiguous ones.
