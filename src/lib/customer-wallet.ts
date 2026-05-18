/** Prototype wallet balance shown across customer screens. */
export const CUSTOMER_WALLET_BALANCE_NAD = 450;

export function formatWalletBalance(amount = CUSTOMER_WALLET_BALANCE_NAD): string {
  return `N$ ${amount.toFixed(2)}`;
}
