import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { STATUS, formatDate } from '../../data/orderStatus'
import AdminNav from '../../components/admin/AdminNav'

const API = import.meta.env.VITE_API_URL

// The buttons each status gets (Laravel checks these rules too)
const ACTIONS = {
  pending:          [{ status: 'confirmed', label: '👍 Confirm' }],
  confirmed:        [{ status: 'out_for_delivery', label: '🛵 Out for delivery' }],
  out_for_delivery: [{ status: 'delivered', label: '✅ Delivered (cash collected)' }],
  delivered:        [],
  cancelled:        [],
}

const FILTERS = ['all', 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled']

function AdminOrders() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Dashboard links pass the tab to open; otherwise new orders first: what needs action
  const [filter, setFilter] = useState(useLocation().state?.filter ?? 'pending')
  const [refreshKey, setRefreshKey] = useState(0)      // change it → the effect runs again
  const [updatingId, setUpdatingId] = useState(null)   // which order's button is busy

  useEffect(() => {
    fetch(`${API}/api/admin/orders`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Server error')
        return response.json()
      })
      .then((data) => setOrders(data))
      .catch(() => setError("Couldn't load orders 😢"))
      .finally(() => setLoading(false))
  }, [token, refreshKey])

  async function changeStatus(order, status) {
    if (status === 'cancelled' && !window.confirm(`Cancel order ${order.order_number}?`)) return

    setUpdatingId(order.id)
    try {
      const response = await fetch(`${API}/api/admin/orders/${order.id}`, {
        method: 'PATCH',   // PATCH = change PART of something (just the status)
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)

      // Replace ONLY the changed order in the list; keep every other order as it is
      setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)))
      showToast(`${data.order_number}: ${STATUS[data.status].label}`)
    } catch (err) {
      showToast(err.message || "Can't reach Yummiii right now.", 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">Loading orders...</h2>
        <div className="dots"><span></span><span></span><span></span></div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">{error}</h2>
        <button className="btn" onClick={() => window.location.reload()}>Try Again</button>
      </section>
    )
  }

  // Derived: how many orders per status (for the tab badges), and which to show
  const countFor = (status) =>
    status === 'all' ? orders.length : orders.filter((o) => o.status === status).length
  const visibleOrders = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <section className="orders">
      <AdminNav />
      <h2 className="section-title">Orders 🛠️</h2>

      <div className="admin-toolbar">
        <div className="admin-filters">
          {FILTERS.map((status) => (
            <button
              key={status}
              className={filter === status ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilter(status)}
            >
              {status === 'all' ? 'All' : `${STATUS[status].emoji} ${STATUS[status].label}`}
              <span className="count">{countFor(status)}</span>
            </button>
          ))}
        </div>
        <button className="btn" onClick={() => setRefreshKey((k) => k + 1)}>🔄 Refresh</button>
      </div>

      {visibleOrders.length === 0 && <p className="empty-note">No orders here 🎉</p>}

      {visibleOrders.map((order) => (
        <article className="order-card" key={order.id}>
          <header className="order-head">
            <div>
              <h3>#{order.order_number}</h3>
              <p className="order-date">{formatDate(order.created_at)}</p>
            </div>
            <span className={`status status-${order.status}`}>
              {STATUS[order.status].emoji} {STATUS[order.status].label}
            </span>
          </header>

          <div className="customer-box">
            <p><strong>{order.customer_name}</strong></p>
            <p>📞 <a href={`tel:${order.phone}`}>{order.phone}</a></p>
            <p>📍 {order.address}, {order.delivery_area}</p>
            {order.notes && <p>📝 {order.notes}</p>}
          </div>

          {order.items.map((item) => (
            <p className="summary-row" key={item.id}>
              <span>{item.product_name} × {item.quantity}</span>
              <span>Rs. {item.line_total.toLocaleString()}</span>
            </p>
          ))}
          <p className="summary-row summary-total">
            <span>💵 Collect on delivery</span>
            <span>Rs. {order.total.toLocaleString()}</span>
          </p>

          {ACTIONS[order.status].length > 0 && (
            <div className="order-actions">
              {ACTIONS[order.status].map((action) => (
                <button key={action.status} className="btn" disabled={updatingId === order.id}
                  onClick={() => changeStatus(order, action.status)}>
                  {action.label}
                </button>
              ))}
              <button className="btn btn-danger" disabled={updatingId === order.id}
                onClick={() => changeStatus(order, 'cancelled')}>
                Cancel order
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}

export default AdminOrders
