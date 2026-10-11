import { useState } from 'react'
import { useLocation } from 'react-router'
import { useToast } from '../context/useToast'
import { STEPS, STATUS, formatDate } from '../data/orderStatus'

// A short, friendly line under the status badge
const NEXT_MESSAGE = {
  pending: "We've got your order! We'll call you soon to confirm it. 📞",
  confirmed: "Your order is confirmed and being prepared. 🍰",
  out_for_delivery: 'Your order is on its way! Please keep the cash ready. 🛵',
  delivered: 'Delivered. Thank you for choosing Yummiii! 💚',
  cancelled: 'This order was cancelled. Please call us if you have any questions.',
}

function TrackOrder() {
  const { showToast } = useToast()
  // Coming from the success page? Its link passes the number + phone so the customer doesn't retype them
  const prefill = useLocation().state ?? {}
  const [orderNumber, setOrderNumber] = useState(prefill.orderNumber ?? '')
  const [phone, setPhone] = useState(prefill.phone ?? '')
  const [order, setOrder] = useState(null)          // the order we found
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setOrder(null)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, phone }),
      })
      const data = await response.json()
      if (response.status === 429) throw new Error('Too many tries. Please wait a minute and try again.')
      if (!response.ok) throw new Error(data.message)
      setOrder(data)
    } catch (err) {
      showToast(err instanceof TypeError ? "Can't reach Yummiii right now." : err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const currentStep = order ? STEPS.indexOf(order.status) : -1   // -1 when cancelled

  return (
    <section className="orders">
      <h2 className="section-title">Track My Order 📦</h2>

      <form className="checkout-form track-form" onSubmit={handleSubmit}>
        <p>Enter the <strong>order number</strong> from your confirmation and the <strong>mobile number</strong> you ordered with.</p>

        <label>
          Order number
          <input placeholder="e.g. YUM-00004" required
            value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
        </label>

        <label>
          Mobile number
          <input type="tel" inputMode="numeric" placeholder="07XXXXXXXX" required
            value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>

        <button type="submit" className="btn btn-cta" disabled={submitting}>
          {submitting ? 'Checking...' : 'Track order'}
        </button>
      </form>

      {order && (
        <article className="order-card">
          <header className="order-head">
            <div>
              <h3>#{order.order_number}</h3>
              <p className="order-date">{formatDate(order.created_at)}</p>
            </div>
            <span className={`status status-${order.status}`}>
              {STATUS[order.status].emoji} {STATUS[order.status].label}
            </span>
          </header>

          <p>Hi {order.customer_name}! {NEXT_MESSAGE[order.status]}</p>

          {/* Tracker: every step up to the current one is "done" */}
          {order.status !== 'cancelled' && (
            <ol className="tracker">
              {STEPS.map((step, index) => (
                <li key={step} className={index <= currentStep ? 'done' : ''}>
                  {STATUS[step].emoji}
                  <span>{STATUS[step].label}</span>
                </li>
              ))}
            </ol>
          )}

          {order.items.map((item) => (
            <p className="summary-row" key={item.id}>
              <span>{item.product_name} × {item.quantity}</span>
              <span>Rs. {item.line_total.toLocaleString()}</span>
            </p>
          ))}
          <p className="summary-row">
            <span>Delivery to {order.delivery_area}</span>
            <span>{order.delivery_fee === 0 ? 'Free' : `Rs. ${order.delivery_fee}`}</span>
          </p>
          <p className="summary-row summary-total">
            <span>💵 Total (Cash on Delivery)</span>
            <span>Rs. {order.total.toLocaleString()}</span>
          </p>
        </article>
      )}
    </section>
  )
}

export default TrackOrder
