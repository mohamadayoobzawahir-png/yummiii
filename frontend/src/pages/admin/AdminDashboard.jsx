import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../api'
import { STATUS } from '../../data/orderStatus'
import AdminNav from '../../components/admin/AdminNav'
import BarChart from '../../components/admin/BarChart'

const rupees = (amount) => `Rs. ${amount.toLocaleString()}`

// '2026-10-11' → 'Sat'
const weekday = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('en-LK', { weekday: 'short' })

function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiRequest('/api/admin/dashboard', { token })
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">{error}</h2>
        <button className="btn" onClick={() => window.location.reload()}>Try Again</button>
      </section>
    )
  }

  if (!stats) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">Loading dashboard...</h2>
      </section>
    )
  }

  return (
    <section className="orders dashboard">
      <AdminNav />
      <h2 className="section-title">Dashboard 📊</h2>

      {/* Headline numbers */}
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-label">💵 Cash collected</span>
          <strong className="stat-value">{rupees(stats.cash_collected)}</strong>
          <span className="stat-note">from delivered orders</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">⏳ Cash to collect</span>
          <strong className="stat-value">{rupees(stats.cash_to_collect)}</strong>
          <span className="stat-note">orders not delivered yet</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">🧾 Orders today</span>
          <strong className="stat-value">{stats.orders_today}</strong>
          <span className="stat-note">{stats.orders_total} orders in total</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">🍰 Items sold</span>
          <strong className="stat-value">{stats.items_sold}</strong>
          <span className="stat-note">cancelled orders not counted</span>
        </div>
      </div>

      {/* Orders by status: click one to open that tab on the Orders page */}
      <div className="dash-card">
        <h3>Orders by status</h3>
        <div className="admin-filters">
          {Object.keys(STATUS).map((status) => (
            <Link key={status} to="/admin/orders" state={{ filter: status }} className="filter-btn">
              {STATUS[status].emoji} {STATUS[status].label}
              <span className="count">{stats.status_counts[status] ?? 0}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Sales over the last 7 days: one series, so one colour and no legend */}
      <div className="dash-card">
        <h3>Sales, last 7 days</h3>
        <BarChart
          title="Sales per day for the last 7 days"
          formatValue={rupees}
          valueIndex={stats.last_7_days.length - 1}
          data={stats.last_7_days.map((day, index) => ({
            label: index === stats.last_7_days.length - 1 ? 'Today' : weekday(day.date),
            value: day.sales,
            tip: `${weekday(day.date)} ${day.date}: ${rupees(day.sales)} · ${day.orders} order${day.orders === 1 ? '' : 's'}`,
          }))}
        />
      </div>

      <div className="dash-columns">
        <div className="dash-card">
          <h3>⭐ Best sellers</h3>
          {stats.best_sellers.length === 0 && <p className="empty-note">No sales yet.</p>}
          {stats.best_sellers.map((product, index) => (
            <p className="summary-row" key={product.id}>
              <span>{index + 1}. {product.name}</span>
              <span>{product.sold_count} sold</span>
            </p>
          ))}
        </div>

        <div className="dash-card">
          <h3>⚠️ Low stock</h3>
          {stats.low_stock.length === 0 && <p className="empty-note">Everything is well stocked 🎉</p>}
          {stats.low_stock.map((product) => (
            <p className="summary-row" key={product.id}>
              <span>{product.name}</span>
              <span className={product.stock === 0 ? 'low-stock' : ''}>
                {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
              </span>
            </p>
          ))}
          {stats.low_stock.length > 0 && <Link to="/admin/products" className="dash-link">Restock in Products →</Link>}
        </div>
      </div>
    </section>
  )
}

export default AdminDashboard
