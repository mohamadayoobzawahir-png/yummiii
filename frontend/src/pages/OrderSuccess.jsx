import { Link, useLocation } from 'react-router'

function OrderSuccess() {
  const location = useLocation()
  const order = location.state?.order

  // Someone opened /order-success directly, or refreshed → there's no order data
  if (!order) {
    return (
      <section className="hero">
        <h1>No order to show 🤔</h1>
        <Link to="/shop" className="btn">Go to Shop</Link>
      </section>
    )
  }

  return (
    <section className="order-success">
      <div className="success-icon">🎉</div>
      <h1>Thank you, {order.customer_name}!</h1>
      <p>Your order <strong>#{order.order_number}</strong> has been placed.</p>

      <div className="order-summary">
        {order.items.map((item) => (
          <p className="summary-row" key={item.id}>
            <span>{item.product_name} × {item.quantity}</span>
            <span>Rs. {item.line_total.toLocaleString()}</span>
          </p>
        ))}
        <hr />
        <p className="summary-row">
          <span>Delivery to {order.delivery_area}</span>
          <span>{order.delivery_fee === 0 ? 'Free' : `Rs. ${order.delivery_fee}`}</span>
        </p>
        <p className="summary-row summary-total">
          <span>Total to pay</span>
          <span>Rs. {order.total.toLocaleString()}</span>
        </p>
      </div>

      <div className="payment-box">
        💵 Please keep <strong>Rs. {order.total.toLocaleString()}</strong> ready.
        We'll call <strong>{order.phone}</strong> before delivery.
      </div>

      <div className="track-hint">
        📦 <strong>Track your order anytime</strong> with your order number
        <strong> #{order.order_number}</strong> and mobile <strong>{order.phone}</strong>.
        <Link to="/track-order" className="btn" state={{ orderNumber: order.order_number, phone: order.phone }}>
          Track my order
        </Link>
      </div>

      <Link to="/shop" className="btn btn-cta">Continue shopping</Link>
    </section>
  )
}

export default OrderSuccess
