// Order statuses, shared by Track My Order (customers) and the Admin dashboard.
// Keep in sync with NEXT_STATUSES in backend/app/Http/Controllers/Admin/OrderController.php

// The happy path an order moves through (cancelled is separate)
export const STEPS = ['pending', 'confirmed', 'out_for_delivery', 'delivered']

export const STATUS = {
  pending:          { label: 'Waiting for confirmation', emoji: '⏳' },
  confirmed:        { label: 'Confirmed',                emoji: '👍' },
  out_for_delivery: { label: 'Out for delivery',         emoji: '🛵' },
  delivered:        { label: 'Delivered',                emoji: '✅' },
  cancelled:        { label: 'Cancelled',                emoji: '❌' },
}

// '2026-10-10T12:30:00Z' → '10 Oct 2026, 6:00 pm'
export function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
}
