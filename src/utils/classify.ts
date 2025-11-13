import type { ActivityType } from "../types/activity";
import type { CovalentTransactionV3Item } from "../types/covalent";

// Heuristische, konservative Klassifikation basierend auf wenigen Feldern.
export function classifyTransaction(item: CovalentTransactionV3Item): ActivityType {
  const hasAddresses = !!item.from_address && !!item.to_address;
  const hasValue = item.value !== undefined && item.value !== null;
  if (hasAddresses && hasValue) return "transfer";
  return "unknown";
}

