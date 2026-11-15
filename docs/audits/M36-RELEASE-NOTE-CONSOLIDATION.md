# M3.6 release-note consolidation candidate

This candidate uses #538's cohort-aware coverage engine and preserves #465's presence, schema,
link and activation safeguards. It is a proposal for review, not authorization to merge any of the
three existing PRs or publish a package.

## Immutable inputs

| Input | Head | Safeguards carried forward |
| --- | --- | --- |
| #538 | `72c7105813e8630bbae844ba0da0771ebdbdef94` | Changeset set equality by cohort and version; explicit exclusions with reasons; malformed metadata refusals; attribution by both cohort and changeset id; stripping process metadata during activation |
| #465 | `355f8a1d7ed14fcb4946ef34e75588118f64b296` | Projected-note presence; unconditional schema sweep; manifest slugs; URL and Markdown destination safety; current-base attribution; literal replacement of note prose |
| #463 | `bfeb62a2cd9fdd3425ed78901344fa03144471bb` | Earlier projected-note presence check; no unique safeguard beyond the later implementation |

The source tree started at main `cee2fd05d4593d25e875eb45832716c88bdbc2c5`. #550 later
advanced main to `414354baf082060543386c1ad11a211c9fdc9000`; that change is DESIGN.md only.
Current acceptance and CI must be read at this candidate's eventual exact head.

## One CI entry point

`pnpm check:release-notes` runs the presence/schema check and then #538's coverage check.
CI invokes it once on the ordinary PR merge checkout. The lower-level commands remain available
for diagnosis. There is one presence implementation and one coverage implementation: a missing
note is reported by presence, while a present note is checked against consumed changeset ids by
coverage. The post-merge missing-note refusal remains intact.

Activation retains both fixes together: `coverage` is omitted from the typed `Release` object,
and replacement-pattern text such as `$$` and `$&` reaches the generated prose unchanged. The
activation control exercises both properties in the same note, preserves the metadata in its
source file and checks that neither metadata nor ids leak into the generated entry.

## Scope and limits

No runtime source, package version, changeset, curated note, release workflow, approval script,
environment or credential changes belong to this candidate. The original PR branches are not
modified. Existing tests from both implementations are retained rather than reimplemented.

The publication owner checklist in RELEASING.md also follows the latest M3.6 policy: required
reviewers, prevention of self-review where supported, main-only deployment and an environment-only
NPM_TOKEN. The earlier solo-maintainer self-review exception is superseded. This is documentation
of required owner actions; no environment setting, approval logic or credential is changed here.

The current main missing 0.27.1 note remains a real base-branch problem. Passing this tooling-only
PR through base attribution does not repair that note or make main release-ready. The owner has
selected the 0.28.0 path, and #545 remains held until its curated note accounts for all changesets
on the eventual integrated main, including #553, #555 and any later accepted accessibility fixes.

The note model is still keyed by core version. A non-core-only release has no curated-note path;
#538 reports that limitation. This candidate does not invent a new note model. Requiring a new
package-specific changeset for a published runtime-source diff is a separate fourth-gate design,
not a capability claimed by this PR.

## Proposed owner sequence

1. Review this focused integration candidate and its current-head evidence.
2. If accepted, choose it as the consolidated delivery of #538 plus #465 safeguards.
3. Only with separate authorization, merge the accepted candidate and close #465/#538/#463 as
   superseded; until then all three remain open and unmerged.
4. Have #545's owning session extend its 0.28.0 note and coverage metadata, then revalidate that
   exact head. Merging #545 or a Version PR remains separately authorized.

Validation logs and the full integration report are maintained outside the repository so their
timestamps and remote status snapshots do not become generated source churn.
