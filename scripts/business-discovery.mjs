/**
 * business-discovery.mjs — derives the website's discovery index (`discovery-index.json`) from the canonical business
 * capability data. Called by gen-business-roadmap.mjs, so `pnpm gen:capabilities` writes it and `pnpm
 * check:capabilities` fails when it is stale or when the discovery block names something that does not exist.
 *
 * Nothing in the index is typed by hand. Every relationship is read from one of:
 *
 *   docs/business-capabilities.json   rows (status, layer, target, evidence, dependsOn) and the `discovery` block:
 *                                     which families form each capability group and business domain, and which rows
 *                                     each workflow stage uses
 *   components.manifest.json          which catalogue slugs exist (evidence `ui:<slug>`)
 *   blocks.manifest.json              which blocks exist (evidence `block:<slug>`)
 *
 * The derivation rules, in one place so the website and the check cannot disagree:
 *
 *   - A row is public unless it is a Pro candidate. Pro rows never reach the index (marketing/STRATEGY.md rule 7).
 *   - A row "ships" when it is existing or partial. Only a shipping row contributes components and blocks; a planned
 *     row contributes its name, marked planned, and nothing else.
 *   - A component's capabilities and domains are those of every shipping row that cites it, plus the domain of every
 *     workflow whose stages use such a row. A domain-neutral family reaches a domain only through a workflow.
 *   - A component's layer and platform target come from the one row that IS it: a shipping row that cites it and
 *     whose name (or one of its " / " alternatives) is the slug once punctuation and case are dropped (DataGrid ↔
 *     data-grid). Any other catalogue entry is "unclassified" on both: a missing roadmap classification is not
 *     evidence of a layer or a target, so it never becomes "L1 core primitive" by default. `unclassified` is carried in
 *     the index only; it has no label, so the site neither shows it nor offers it as a filter.
 *   - "Builds toward" for a component is the planned rows whose `dependsOn` names it.
 *   - A block's capabilities, domains and workflows come only from the shipping rows that cite `block:<slug>`, by the
 *     same rule as a component's. Every published block is either cited or listed in `discovery.unclassifiedBlocks`
 *     with a reason; one in neither place, or in both, is an error.
 *   - Every workflow has at least one stage that uses a shipping row.
 *   - A stage is existing when every row it uses is existing, planned when none ships, partial otherwise; a workflow's
 *     `coverage` counts its stages by that status, so one available part never makes a whole workflow available.
 *   - A domain may have a page (`"page": true`) only when it meets the publication criteria: at least one workflow,
 *     every workflow shipping more than half its stages, and at least PAGE_MIN_DESTINATIONS shipping catalogue
 *     components or blocks to link to. Every domain carries `publication` with the criteria it does not meet.
 */

/** Layer and target of a catalogue entry no roadmap row classifies. Distinct from L1: absence is not a claim. */
export const UNCLASSIFIED = "unclassified";
const LAYER_LABEL = { L1: "Core primitive", L2: "Enterprise", L3: "Domain", L4: "Block" };
const TARGET_LABEL = {
  "cross-platform-core": "Cross-platform core",
  "web-first-enterprise": "Web-first enterprise",
  "react-domain": "React-only domain",
  block: "Block / composition",
};
const ID = /^[a-z][a-z0-9-]*$/;

const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const alternatives = (name) => name.split(" / ").map((s) => s.trim());
/** "NumberInput" → "number-input", "InputOTP" → "input-otp" — the same rule as apps/web/src/lib/block-components.ts. */
const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

const uniq = (xs) => [...new Set(xs)];
const ships = (row) => row.status === "existing" || row.status === "partial";
/**
 * A workflow stage's status from the rows it uses: available only when every row is existing, planned when none ships,
 * partial otherwise. A stage is never "available" because one of its parts is.
 */
const stageStatus = (list) =>
  list.every((r) => r.status === "existing") ? "existing" : list.some(ships) ? "partial" : "planned";
/** Publication criterion (3): the fewest shipping catalogue components + blocks a domain page may send a reader to. */
export const PAGE_MIN_DESTINATIONS = 5;
const refs = (row, kind) => row.evidence.filter((r) => r.startsWith(`${kind}:`)).map((r) => r.slice(kind.length + 1));

/**
 * @param data      parsed docs/business-capabilities.json
 * @param manifest  components.manifest.json `components`
 * @param blocks    blocks.manifest.json `blocks`
 * @returns {{ index: object, errors: string[] }}
 */
export function buildDiscovery(data, manifest, blocks) {
  const errors = [];
  const disc = data.discovery;
  if (!disc) return { index: null, errors: ["business-capabilities.json: `discovery` block missing"] };

  const families = new Map(data.families.map((f) => [f.id, f]));
  const rows = new Map(data.families.flatMap((f) => f.capabilities.map((r) => [r.name, { ...r, family: f.id }])));

  /* ------------------------------------------------------------------------------------------ registries */

  const checkRegistry = (kind, list, { exactlyOnce }) => {
    const ids = new Set();
    const owner = new Map();
    for (const entry of list) {
      if (!ID.test(entry.id)) errors.push(`discovery.${kind}: id "${entry.id}" is not kebab-case`);
      if (ids.has(entry.id)) errors.push(`discovery.${kind}: duplicate id "${entry.id}"`);
      ids.add(entry.id);
      if (!entry.title || !entry.summary) errors.push(`discovery.${kind} / ${entry.id}: title and summary are required`);
      for (const f of entry.families) {
        if (!families.has(f)) errors.push(`discovery.${kind} / ${entry.id}: family "${f}" does not exist`);
        if (exactlyOnce && owner.has(f)) errors.push(`discovery.${kind}: family "${f}" is in both "${owner.get(f)}" and "${entry.id}"`);
        owner.set(f, entry.id);
      }
    }
    if (exactlyOnce) for (const f of families.keys()) if (!owner.has(f)) errors.push(`discovery.${kind}: family "${f}" is in no group`);
    return owner;
  };
  const capabilityOf = checkRegistry("capabilities", disc.capabilities, { exactlyOnce: true });
  checkRegistry("domains", disc.domains, { exactlyOnce: false });
  const domainsOf = (familyId) => disc.domains.filter((d) => d.families.includes(familyId)).map((d) => d.id);
  const domainIds = new Set(disc.domains.map((d) => d.id));

  const workflowIds = new Set();
  for (const w of disc.workflows) {
    if (!ID.test(w.id)) errors.push(`discovery.workflows: id "${w.id}" is not kebab-case`);
    if (workflowIds.has(w.id)) errors.push(`discovery.workflows: duplicate id "${w.id}"`);
    workflowIds.add(w.id);
    if (!domainIds.has(w.domain)) errors.push(`discovery.workflows / ${w.id}: domain "${w.domain}" does not exist`);
    if (!w.stages?.length) errors.push(`discovery.workflows / ${w.id}: no stages`);
    for (const s of w.stages ?? []) {
      if (!s.uses.length) errors.push(`discovery.workflows / ${w.id} / ${s.title}: a stage must use at least one row`);
      for (const name of s.uses) {
        const row = rows.get(name);
        if (!row) errors.push(`discovery.workflows / ${w.id} / ${s.title}: "${name}" is not a capability row`);
        else if (row.tier === "pro") errors.push(`discovery.workflows / ${w.id} / ${s.title}: "${name}" is a Pro candidate and cannot be shown`);
      }
    }
  }
  // A block no shipping row cites must be named here, with the reason it has no capability, so "untagged" is always a
  // decision someone wrote down rather than a gap nobody noticed.
  const unclassifiedBlocks = new Map();
  for (const entry of disc.unclassifiedBlocks ?? []) {
    if (!blocks[entry.block]) errors.push(`discovery.unclassifiedBlocks: "${entry.block}" is not a block in blocks.manifest.json`);
    if (unclassifiedBlocks.has(entry.block)) errors.push(`discovery.unclassifiedBlocks: duplicate block "${entry.block}"`);
    if (!entry.reason?.trim()) errors.push(`discovery.unclassifiedBlocks / ${entry.block}: a reason is required`);
    unclassifiedBlocks.set(entry.block, entry.reason);
  }
  if (errors.length) return { index: null, errors };

  /* ---------------------------------------------------------------------------------------------- rows */

  const pub = [...rows.values()].filter((r) => r.tier !== "pro");
  /** The public projection of a row: what a page may say about it. Planned rows carry no components or blocks. */
  const rowView = (r) => ({
    name: r.name,
    status: r.status,
    delivery: r.delivery,
    layer: r.layer,
    components: ships(r) ? refs(r, "ui").filter((s) => manifest[s]) : [],
    blocks: ships(r) ? refs(r, "block").filter((s) => blocks[s]) : [],
    iot: ships(r) ? refs(r, "iot") : [],
  });

  // workflow → the rows its stages use; row → the workflows that use it
  const workflowsOfRow = new Map();
  for (const w of disc.workflows)
    for (const s of w.stages) for (const name of s.uses) workflowsOfRow.set(name, uniq([...(workflowsOfRow.get(name) ?? []), w.id]));
  const workflowDomain = Object.fromEntries(disc.workflows.map((w) => [w.id, w.domain]));

  /* ------------------------------------------------------------------------------------- components */

  const components = {};
  const add = (bag, slug, key, values) => {
    bag[slug] ??= { capabilities: [], domains: [], workflows: [] };
    bag[slug][key] = uniq([...bag[slug][key], ...values]);
  };
  for (const r of pub.filter(ships)) {
    const wf = workflowsOfRow.get(r.name) ?? [];
    const doms = [...domainsOf(r.family), ...wf.map((w) => workflowDomain[w])];
    for (const slug of refs(r, "ui").filter((s) => manifest[s])) {
      add(components, slug, "capabilities", [capabilityOf.get(r.family)]);
      add(components, slug, "domains", doms);
      add(components, slug, "workflows", wf);
    }
  }

  const owningRow = (slug) =>
    pub.find((r) => ships(r) && refs(r, "ui").includes(slug) && alternatives(r.name).some((a) => squash(a) === squash(slug)));

  const catalogue = {};
  for (const slug of Object.keys(manifest).sort()) {
    const own = owningRow(slug);
    const rel = components[slug] ?? { capabilities: [], domains: [], workflows: [] };
    const names = new Set([slug, ...(own ? alternatives(own.name).map(kebab) : [])]);
    const buildsToward = pub
      .filter((r) => r.status === "planned" && r.dependsOn.some((d) => names.has(kebab(d))))
      .map((r) => r.name);
    const entry = {
      layer: own?.layer ?? UNCLASSIFIED,
      target: own && own.target !== "pro-candidate" ? own.target : UNCLASSIFIED,
      ...(own ? { roadmapRow: own.name } : {}),
      capabilities: rel.capabilities,
      domains: rel.domains,
      workflows: rel.workflows,
      ...(buildsToward.length ? { buildsToward } : {}),
    };
    catalogue[slug] = entry;
  }

  /* ------------------------------------------------------------------------------------------ blocks */

  const blockIndex = {};
  for (const slug of Object.keys(blocks).sort()) blockIndex[slug] = { capabilities: [], domains: [], workflows: [] };
  for (const r of pub.filter(ships)) {
    const wf = workflowsOfRow.get(r.name) ?? [];
    for (const slug of refs(r, "block").filter((s) => blocks[s])) {
      add(blockIndex, slug, "capabilities", [capabilityOf.get(r.family)]);
      add(blockIndex, slug, "domains", [...domainsOf(r.family), ...wf.map((w) => workflowDomain[w])]);
      add(blockIndex, slug, "workflows", wf);
    }
  }

  for (const [slug, b] of Object.entries(blocks)) {
    const cited = blockIndex[slug].capabilities.length > 0;
    if (cited && unclassifiedBlocks.has(slug))
      errors.push(`discovery.unclassifiedBlocks: "${slug}" is cited by a shipping row, so it is not unclassified — remove it from the list`);
    if (!cited && !unclassifiedBlocks.has(slug) && b.status !== "draft")
      errors.push(
        `blocks.manifest.json / ${slug}: no shipping row cites block:${slug} and it is not in discovery.unclassifiedBlocks — ` +
          `cite it from the row it demonstrates, or list it there with the reason it has none`,
      );
  }

  // A workflow whose every stage is planned would be a page of promises; a stage can be planned, the whole path cannot.
  for (const w of disc.workflows)
    if (!w.stages.some((s) => s.uses.some((name) => ships(rows.get(name)))))
      errors.push(`discovery.workflows / ${w.id}: no stage uses an existing or partial row, so nothing of it ships`);

  /* --------------------------------------------------------------------- capability groups, domains */

  const summarise = (list) => ({
    existing: list.filter((r) => r.status === "existing").length,
    partial: list.filter((r) => r.status === "partial").length,
    planned: list.filter((r) => r.status === "planned").length,
  });
  const shipped = (list) => ({
    components: uniq(list.filter(ships).flatMap((r) => refs(r, "ui").filter((s) => manifest[s]))).sort(),
    blocks: uniq(list.filter(ships).flatMap((r) => refs(r, "block").filter((s) => blocks[s]))).sort(),
    iot: uniq(list.filter(ships).flatMap((r) => refs(r, "iot"))).sort(),
  });

  const capabilities = disc.capabilities.map((c) => {
    const list = pub.filter((r) => c.families.includes(r.family) && r.status !== "not-planned");
    return {
      id: c.id,
      title: c.title,
      summary: c.summary,
      families: c.families.map((f) => ({ id: f, title: families.get(f).title })),
      counts: summarise(list),
      ...shipped(list),
      rows: list.map((r) => r.name),
    };
  });

  const domains = disc.domains.map((d) => {
    const wfs = disc.workflows.filter((w) => w.domain === d.id);
    const viaWorkflow = new Set(wfs.flatMap((w) => w.stages.flatMap((s) => s.uses)));
    const list = pub.filter((r) => (d.families.includes(r.family) || viaWorkflow.has(r.name)) && r.status !== "not-planned");
    const caps = uniq(list.map((r) => capabilityOf.get(r.family)));
    return {
      id: d.id,
      title: d.title,
      summary: d.summary,
      page: d.page,
      counts: summarise(list),
      ...shipped(list),
      capabilities: disc.capabilities.map((c) => c.id).filter((id) => caps.includes(id)),
      workflows: wfs.map((w) => w.id),
      rows: list.map((r) => r.name),
    };
  });

  const workflows = disc.workflows.map((w) => {
    const stages = w.stages.map((s) => ({ title: s.title, rows: s.uses, status: stageStatus(s.uses.map((n) => rows.get(n))) }));
    return {
      id: w.id,
      title: w.title,
      domain: w.domain,
      summary: w.summary,
      stages,
      coverage: summarise(stages),
    };
  });

  // A domain page that says "available now" must have something available, or it is a list of promises.
  for (const d of domains)
    if (d.page && d.counts.existing + d.counts.partial === 0)
      errors.push(`discovery.domains / ${d.id}: has a page but no existing or partial capability to show`);

  // Publication criteria: a page is only worth publishing when it has a workflow a reader can mostly follow today and
  // enough real destinations to send them to. Evaluated for every domain; a page that fails them is an error, a domain
  // that meets them without a page is an owner decision, not an error.
  for (const d of domains) {
    const wfs = workflows.filter((w) => w.domain === d.id);
    const unmet = [];
    if (!wfs.length) unmet.push("has no workflow");
    for (const w of wfs)
      if (2 * (w.coverage.existing + w.coverage.partial) <= w.stages.length)
        unmet.push(`workflow "${w.id}" ships ${w.coverage.existing + w.coverage.partial} of ${w.stages.length} stages, not more than half`);
    const destinations = d.components.length + d.blocks.length;
    if (destinations < PAGE_MIN_DESTINATIONS)
      unmet.push(`${destinations} shipping catalogue components or blocks, fewer than ${PAGE_MIN_DESTINATIONS}`);
    d.publication = { eligible: unmet.length === 0, unmet };
    if (d.page && unmet.length) errors.push(`discovery.domains / ${d.id}: has a page but does not meet the publication criteria: ${unmet.join("; ")}`);
  }

  const index = {
    $comment:
      "GENERATED by `pnpm gen:capabilities` (scripts/business-discovery.mjs) from docs/business-capabilities.json, components.manifest.json and blocks.manifest.json. Do not edit; `pnpm check:capabilities` fails when it is stale.",
    layers: LAYER_LABEL,
    targets: TARGET_LABEL,
    rows: Object.fromEntries(pub.filter((r) => r.status !== "not-planned").map((r) => [r.name, rowView(r)])),
    capabilities,
    domains,
    workflows,
    components: catalogue,
    blocks: blockIndex,
  };
  return { index, errors };
}
