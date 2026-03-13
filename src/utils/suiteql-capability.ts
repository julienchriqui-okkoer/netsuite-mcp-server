import type { NetSuiteClient } from "../netsuite-client.js";

let suiteQLAllowed: boolean | null = null;

/**
 * Detect if the current NetSuite role has SuiteQL access (cached per process).
 * Probes with a minimal read-only query. Use this to route between SuiteQL and REST fallbacks.
 */
export async function canUseSuiteQL(client: NetSuiteClient): Promise<boolean> {
  if (suiteQLAllowed !== null) return suiteQLAllowed;

  try {
    await client.suiteql("SELECT id FROM account", 1);
    suiteQLAllowed = true;
  } catch (e: unknown) {
    const msg = String((e as Error)?.message ?? "").toLowerCase();
    if (
      msg.includes("missing permission") ||
      msg.includes("suiteql") ||
      msg.includes("invalid search query") ||
      msg.includes("403") ||
      msg.includes("forbidden")
    ) {
      suiteQLAllowed = false;
    } else {
      suiteQLAllowed = false;
    }
  }
  return suiteQLAllowed;
}

/**
 * Reset cached capability (e.g. for tests or after role change).
 */
export function resetSuiteQLCapability(): void {
  suiteQLAllowed = null;
}
