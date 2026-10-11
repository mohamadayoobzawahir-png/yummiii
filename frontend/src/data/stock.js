// At or below this many left, a product counts as "low stock" (same as Product::LOW_STOCK in Laravel)
export const LOW_STOCK = 5

// 'out' | 'low' | 'ok' — products at 0 are out of stock automatically
export function stockLevel(stock) {
  if (stock <= 0) return 'out'
  if (stock <= LOW_STOCK) return 'low'
  return 'ok'
}

// Why the stock changed (same list as StockMovement::REASONS in Laravel)
export const STOCK_REASONS = {
  opening:   { label: 'Starting stock', emoji: '🏁' },
  created:   { label: 'Product added', emoji: '🆕' },
  order:     { label: 'Order', emoji: '🛒' },
  cancelled: { label: 'Order cancelled', emoji: '↩️' },
  restock:   { label: 'Restocked', emoji: '📦' },
  adjusted:  { label: 'Adjusted', emoji: '✏️' },
}

