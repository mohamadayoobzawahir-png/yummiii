import { useState, useEffect } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../api'

// Tabs at the top of every admin page. NavLink adds class "active" to the current page's link.
// refresh: change it (e.g. after restocking) to reload the stock alert badge.
function AdminNav({ refresh = 0 }) {
  const { token } = useAuth()
  const [alerts, setAlerts] = useState(0)

  useEffect(() => {
    apiRequest('/api/admin/stock-alerts', { token })
      .then((data) => setAlerts(data.low + data.out))
      .catch(() => setAlerts(0))   // the badge is a bonus: never break the page for it
  }, [token, refresh])

  return (
    <nav className="admin-nav">
      {/* end: only "active" on /admin itself, not on /admin/orders etc. */}
      <NavLink to="/admin" end>📊 Dashboard</NavLink>
      <NavLink to="/admin/orders">📋 Orders</NavLink>
      <NavLink to="/admin/sales">💰 Sales</NavLink>
      <NavLink to="/admin/stock">
        📦 Stock
        {alerts > 0 && <span className="nav-badge" aria-label={`${alerts} products low or out of stock`}>{alerts}</span>}
      </NavLink>
      <NavLink to="/admin/products">🍰 Products</NavLink>
      <NavLink to="/admin/categories">🗂️ Categories</NavLink>
    </nav>
  )
}

export default AdminNav
