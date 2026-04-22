/**
 * Token Configuration
 *
 * Defines token costs for various operations and token-related settings.
 */

export type TokenOperationType = 'scrape_junkyard' | 'search_ebay' | 'run_analysis' | 'add_junkyard';

export interface TokenCost {
  type: TokenOperationType;
  cost: number;
  description: string;
}

/**
 * Token costs for each operation type
 */
export const TOKEN_COSTS: Record<TokenOperationType, TokenCost> = {
  scrape_junkyard: {
    type: 'scrape_junkyard',
    cost: 10,
    description: 'Scrape junkyard inventory from URL',
  },
  search_ebay: {
    type: 'search_ebay',
    cost: 5,
    description: 'Search eBay for parts',
  },
  run_analysis: {
    type: 'run_analysis',
    cost: 20,
    description: 'Run market price/compatibility analysis',
  },
  add_junkyard: {
    type: 'add_junkyard',
    cost: 2,
    description: 'Add a new junkyard to your list',
  },
};

/**
 * Get the cost of an operation
 */
export function getTokenCost(operation: TokenOperationType): number {
  return TOKEN_COSTS[operation].cost;
}

/**
 * Check if user has enough tokens for an operation
 */
export function hasEnoughTokens(userTokens: number, operation: TokenOperationType): boolean {
  return userTokens >= getTokenCost(operation);
}

/**
 * Calculate remaining tokens after operation
 */
export function calculateRemainingTokens(userTokens: number, operation: TokenOperationType): number {
  return userTokens - getTokenCost(operation);
}

/**
 * Default starting tokens for new users
 */
export const DEFAULT_STARTING_TOKENS = 100;

/**
 * Token purchase packages (if implementing purchases)
 */
export interface TokenPackage {
  id: string;
  tokens: number;
  price: number; // in cents
  name: string;
  popular?: boolean;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'starter',
    tokens: 50,
    price: 499, // $4.99
    name: 'Starter Pack',
  },
  {
    id: 'standard',
    tokens: 100,
    price: 899, // $8.99
    name: 'Standard Pack',
    popular: true,
  },
  {
    id: 'bulk',
    tokens: 250,
    price: 1999, // $19.99
    name: 'Bulk Pack',
  },
  {
    id: 'enterprise',
    tokens: 500,
    price: 3499, // $34.99
    name: 'Enterprise Pack',
  },
];

/**
 * Token-related error messages
 */
export const TOKEN_ERRORS = {
  INSUFFICIENT_TOKENS: 'You do not have enough tokens for this operation.',
  INVALID_OPERATION: 'Invalid token operation type.',
  TRANSACTION_FAILED: 'Token transaction failed. Please try again.',
} as const;
