/**
 * native-motion-ledger.mjs — one effective view of the native motion ledger, for both gates.
 *
 * `scripts/native-motion-spec.mjs` holds the declarations. Two gates read them, and until now each
 * read a DIFFERENT projection of the same object:
 *
 *   check-native-motion.mjs   reads `families[].members`, `.helper`, `.test`, `.strict`,
 *                             `.directions`, plus KNOWN_GAPS and DIRECTION_TERMS.
 *                             It never once reads `contractRole`.
 *   check-motion-tokens.mjs   reads `families[].contractRole` and `.helper`, and nothing else.
 *                             It never reads the members, the test, the gaps or the vocabulary.
 *
 * So each gate could be green on a ledger the other would reject, and a fact that belonged to
 * neither projection was checked by nobody. Measured on `00e2781c`:
 *
 *   - A fourth platform added to the ledger — families, helpers, members, its own test — produced
 *     ZERO errors from the contract gate, because that gate carried a hardcoded
 *     `NATIVE_PLATFORMS = { SwiftUI, Compose, Flutter }` allowlist and silently `continue`d past any
 *     key not in it. The native gate held the new platform; the contract was never held to it at
 *     all. A gate that skips what it does not recognise fails open, which is the one thing a gate
 *     must not do.
 *   - A `DIRECTION_TERMS` entry for a family no platform declares was read by nothing, so the
 *     vocabulary could go stale in the direction the ledger's own staleness clause does not cover.
 *
 * This module composes the declarations ONCE, checks the facts that are properties of the ledger
 * itself rather than of either gate's subject, and hands both gates the same object. A ledger
 * incoherence is now red in both gates instead of invisible to one.
 *
 * It deliberately checks nothing about the source tree or the contract: whether a helper file exists
 * is the native gate's question, and whether a role mentions a platform is the contract gate's.
 * This is only the ledger agreeing with itself.
 */
import { DIRECTION_TERMS, KNOWN_GAPS, PLATFORMS } from "./native-motion-spec.mjs";

/**
 * Compose the ledger into the shape both gates iterate, with the coherence errors found on the way.
 *
 * The three parameters are seams, not settings. The ledger is a static ESM import, so `--overrides`
 * — which substitutes file CONTENT — cannot reach it; without a seam every claim below would be
 * unwatchable. The CLIs pass nothing. The guard tests pass mutated ledgers to watch each clause fail.
 *
 * Their types are the shapes this function READS, not `typeof PLATFORMS`: a control that proves the
 * missing-`contractRole` diagnosis has to pass a ledger with that key absent, which the exact type of
 * the real ledger forbids. Same reasoning as the `ledgerPlatforms` seam it replaces.
 *
 * @param {object} [seams]
 * @param {Record<string, { contractPlatform?: string, dir?: string, ext?: string, animates?: RegExp, preference?: RegExp, families?: Record<string, { contractRole?: string | null, roleExemption?: string, helper?: string, members?: string[], test?: string, strict?: boolean, directions?: RegExp[] }> }>} [seams.platforms]
 * @param {Record<string, Record<string, RegExp>>} [seams.directionTerms]
 * @param {Record<string, Record<string, string>>} [seams.knownGaps]
 * @returns {{ platforms: Array<object>, errors: string[] }}
 */
export function composeLedger({ platforms = PLATFORMS, directionTerms = DIRECTION_TERMS, knownGaps = KNOWN_GAPS } = {}) {
  const errors = [];
  const fail = (msg) => errors.push(msg);
  const composed = [];
  /** contractPlatform → the ledger key that claimed it, so a collision names both sides. */
  const claimed = new Map();
  /** Every family name any platform declares, to find vocabulary that describes nothing. */
  const declaredFamilies = new Set();

  for (const [name, p] of Object.entries(platforms)) {
    /* The contract gate used to map a ledger key to a contract platform through a hardcoded
     * allowlist, and skip anything missing from it. A platform now has to SAY which contract
     * platform it is, and one that does not is an error rather than a silent omission — the whole
     * point being that adding a platform to the ledger can no longer leave the contract unchecked. */
    if (!p.contractPlatform) {
      fail(
        `native ledger: platform ${name} declares no contractPlatform, so nothing says which platform ` +
          `the motion contract should be held to for it. A platform the contract gate cannot name is a ` +
          `platform the contract is never checked against.`,
      );
    } else if (claimed.has(p.contractPlatform)) {
      fail(
        `native ledger: platforms ${claimed.get(p.contractPlatform)} and ${name} both declare ` +
          `contractPlatform "${p.contractPlatform}"; a contract platform must identify one ledger platform.`,
      );
    } else {
      claimed.set(p.contractPlatform, name);
    }

    const families = [];
    const members = new Map();
    for (const [family, f] of Object.entries(p.families ?? {})) {
      declaredFamilies.add(family);

      /* Three states, and the difference between the second and the third is the whole point.
       *   a string  — this family implements that contract role.
       *   null      — it implements none, and `roleExemption` says why. An explicit decision.
       *   absent    — nobody has decided. Silence is not a decision.
       * Before this, absent was the only way to say "no role", so a family that genuinely implements
       * none could only be added by making the gate red — which pressures an author into naming a
       * role that is not true, and a false contractRole is worse than a declared exemption. */
      let contractRole = null;
      let exemption = null;
      if (f.contractRole === undefined) {
        fail(
          `native ledger: the ${name} ${family} family names no contractRole, so nothing says which ` +
            `motion role it implements and the contract cannot be held to it. If it implements none, say ` +
            `so with \`contractRole: null\` and a \`roleExemption\` reason.`,
        );
      } else if (f.contractRole === null) {
        if (!f.roleExemption) {
          fail(
            `native ledger: the ${name} ${family} family declares \`contractRole: null\` with no ` +
              `\`roleExemption\`, so it claims to implement no motion role and gives no reason. An ` +
              `exemption without a reason is indistinguishable from an oversight.`,
          );
        } else {
          exemption = f.roleExemption;
        }
      } else {
        contractRole = f.contractRole;
      }

      /* The direction vocabulary is a property of the family NAME, so it belongs here rather than
       * inside the native gate's per-family loop, where it was reached only after that family's test
       * file had been found and parsed. A family whose test is missing used to leave its missing
       * vocabulary unreported. */
      const terms = directionTerms[family];
      if (!terms) {
        fail(
          `native ledger: the ${family} family has no direction vocabulary in DIRECTION_TERMS, so the ` +
            `direction check has nothing to read for it.`,
        );
      }

      for (const m of f.members ?? []) {
        if (members.has(m)) {
          fail(`native ledger: ${name}/${m} is a member of both the ${members.get(m)} and ${family} families.`);
        } else {
          members.set(m, family);
        }
      }
      if (f.helper && (f.members ?? []).includes(f.helper)) {
        fail(
          `native ledger: ${name}/${f.helper} is the ${family} family's helper and also one of its members. ` +
            `The helper is what the members delegate to; a helper that delegates to itself makes the ` +
            `wiring check vacuous.`,
        );
      }

      families.push({ name: family, ...f, contractRole, exemption, terms, helperPath: `${p.dir}/${f.helper}` });
    }

    const gaps = knownGaps[name] ?? {};
    for (const g of Object.keys(gaps)) {
      /* The native gate catches this from the other side — a gap that is now in a family is a dead
       * entry — but only for the platform it is iterating, and only as a staleness complaint. Said
       * here it is what it is: the ledger claims the same file is both wired up and outstanding. */
      if (members.has(g)) {
        fail(
          `native ledger: ${name}/${g} is listed in KNOWN_GAPS and is also a member of the ` +
            `${members.get(g)} family. It cannot be both wired to the reader's setting and an ` +
            `outstanding gap.`,
        );
      }
    }

    composed.push({ name, ...p, families, gaps });
  }

  for (const family of Object.keys(directionTerms)) {
    if (!declaredFamilies.has(family)) {
      fail(
        `native ledger: DIRECTION_TERMS describes a "${family}" family that no platform declares. ` +
          `Dead vocabulary is read by nothing, so it cannot be trusted to still mean what it says.`,
      );
    }
  }

  return { platforms: composed, errors };
}
