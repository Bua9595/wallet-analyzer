// Partial, tolerant types for Covalent transactions_v3 responses
export interface CovalentTransactionV3Item {
  tx_hash?: string;
  block_signed_at?: string;
  from_address?: string;
  to_address?: string;
  // many more fields exist; we keep this minimal for parsing
  value?: string | number;
  value_quote?: number;
}

export interface CovalentTransactionsV3Response {
  items?: CovalentTransactionV3Item[];
  // Some responses may be arrays directly in data
  length?: number;
}

