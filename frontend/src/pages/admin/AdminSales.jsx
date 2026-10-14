import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { apiRequest, apiDownload } from '../../api'
import { STATUS, formatDate } from '../../data/orderStatus'
import AdminNav from '../../components/admin/AdminNav'
import BarChart from '../../components/admin/BarChart'

const PERIODS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
]

const rupees = (amount) => `Rs. ${amount.toLocaleString()}`
const ORDERS_SHOWN = 10   // the rest behind "Show all"

function AdminSales() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [period, setPeriod] = useState('day')
  const [date, setDate] = useState(null)        // null = the current day/week/month/year
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [showAllOrders, setShowAllOrders] = useState(false)

  const query = `period=${period}${date ? `&date=${date}` : ''}`

  useEffect(() => {
    let ignore = false   // a newer request started → ignore this (older) reply
    apiRequest(`/api/admin/sales?${query}`, { token })
      .then((data) => { if (!ignore) setReport(data) })
      .catch((err) => { if (!ignore) setError(err.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [token, query])

  // Loading starts in the click handlers (not in the effect), so the old numbers fade while we wait
  function changePeriod(value) {
    setLoading(true)
    setPeriod(value)
    setDate(null)
  }

  function goTo(newDate) {
    setLoading(true)
    setDate(newDate)
  }

  async function download() {
    setDownloading(true)
    try {
      await apiDownload(`/api/admin/sales/export?${query}`, { token }, `yummiii-sales-${period}-${report.start}.xlsx`)
      showToast('Excel file downloaded ✅')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setDownloading(false)
    }
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

  if (!report) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">Loading sales...</h2>
      </section>
    )
  }

  const s = report.summary
  const nowIndex = report.is_current ? currentBarIndex(report) : -1

  return (
    <section className={loading ? 'orders dashboard is-loading' : 'orders dashboard'}>
      <AdminNav />
      <h2 className="section-title">Sales 💰</h2>

      <div className="sales-toolbar">
        <div className="admin-filters" role="group" aria-label="Period">
          {PERIODS.map((p) => (
            <button key={p.value} className={period === p.value ? 'filter-btn active' : 'filter-btn'}
              aria-pressed={period === p.value} onClick={() => changePeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="period-nav">
          <button className="filter-btn" onClick={() => goTo(report.previous)} aria-label="Previous period">‹</button>
          <strong>{report.label}</strong>
          <button className="filter-btn" onClick={() => goTo(report.next)} disabled={report.is_current} aria-label="Next period">›</button>
          {!report.is_current && <button className="filter-btn" onClick={() => goTo(null)}>Back to now</button>}
        </div>

        <button className="btn" onClick={download} disabled={downloading}>
          {downloading ? 'Preparing...' : '⬇️ Download Excel'}
        </button>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-label">💰 Sales</span>
          <strong className="stat-value">{rupees(s.sales_total)}</strong>
          <span className="stat-note">{s.orders} orders · avg {rupees(s.average_order)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">💵 Cash collected</span>
          <strong className="stat-value">{rupees(s.cash_collected)}</strong>
          <span className="stat-note">delivered orders</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">⏳ Cash to collect</span>
          <strong className="stat-value">{rupees(s.cash_to_collect)}</strong>
          <span className="stat-note">not delivered yet</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">🍰 Items sold</span>
          <strong className="stat-value">{s.items_sold}</strong>
          <span className="stat-note">{s.cancelled_orders} cancelled order(s) not counted</span>
        </div>
      </div>

      <div className="dash-card">
        <h3>Sales by {period === 'day' ? 'hour' : period === 'year' ? 'month' : 'day'}</h3>
        <BarChart
          title={`Sales for ${report.label}`}
          formatValue={rupees}
          valueIndex={nowIndex}
          data={report.chart.map((bar) => ({
            label: bar.label,
            value: bar.sales,
            tip: `${bar.label}: ${rupees(bar.sales)} · ${bar.orders} order${bar.orders === 1 ? '' : 's'}`,
          }))}
        />
      </div>

      <div className="dash-card">
        <h3>⭐ Products sold</h3>
        {report.products.length === 0 && <p className="empty-note">No sales in this period.</p>}
        {report.products.map((product, index) => (
          <p className="summary-row" key={product.name}>
            <span>{index + 1}. {product.name} × {product.quantity}</span>
            <span>{rupees(product.sales)}</span>
          </p>
        ))}
      </div>

      {/* Full width, so dates and names don't wrap into tall rows */}
      <div className="dash-card">
        <h3>🧾 Orders ({report.orders.length})</h3>
        {report.orders.length === 0 && <p className="empty-note">No orders in this period.</p>}
        <div className="table-scroll">
          <table className="data-table">
            <tbody>
              {(showAllOrders ? report.orders : report.orders.slice(0, ORDERS_SHOWN)).map((order) => (
                <tr key={order.id} className={order.status === 'cancelled' ? 'is-cancelled' : ''}>
                  <td className="nowrap"><strong>{order.order_number}</strong></td>
                  <td className="nowrap order-date">{formatDate(order.created_at)}</td>
                  <td>{order.customer_name}<span className="order-date"> · {order.delivery_area}</span></td>
                  <td className="nowrap">{STATUS[order.status]?.emoji} {STATUS[order.status]?.label}</td>
                  <td className="num">{rupees(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {report.orders.length > ORDERS_SHOWN && (
          <button className="btn btn-light show-all" onClick={() => setShowAllOrders((v) => !v)}>
            {showAllOrders ? 'Show fewer' : `Show all ${report.orders.length} orders`}
          </button>
        )}
      </div>
    </section>
  )
}

// Which bar is "now" (this hour / today / this month), to show its value
function currentBarIndex(report) {
  const now = new Date()
  if (report.period === 'day') return now.getHours()
  if (report.period === 'week') return (now.getDay() + 6) % 7   // Monday = 0
  if (report.period === 'month') return now.getDate() - 1
  return now.getMonth()
}

export default AdminSales
