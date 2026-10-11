import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../context/useAuth'
import { apiRequest } from '../../api'
import { STOCK_REASONS } from '../../data/stock'
import { formatDate } from '../../data/orderStatus'
import AdminNav from '../../components/admin/AdminNav'

function AdminStockHistory() {
  const { token } = useAuth()
  // Filters live in the URL (/admin/stock/history?product=3&reason=order), so the
  // 📜 History button on the Stock page can open this page already filtered
  const [searchParams, setSearchParams] = useSearchParams()
  const productId = searchParams.get('product') ?? ''
  const reason = searchParams.get('reason') ?? ''

  const [products, setProducts] = useState([])
  const [entries, setEntries] = useState([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Product names for the filter dropdown
  useEffect(() => {
    apiRequest('/api/admin/products', { token })
      .then((data) => setProducts([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setProducts([]))
  }, [token])

  // One page (30 entries) at a time: page 1 replaces the list, "Load more" adds to it
  useEffect(() => {
    let ignore = false
    const query = new URLSearchParams({ page })
    if (productId) query.set('product_id', productId)
    if (reason) query.set('reason', reason)

    apiRequest(`/api/admin/stock-history?${query}`, { token })
      .then((data) => {
        if (ignore) return
        setEntries((prev) => (page === 1 ? data.data : [...prev, ...data.data]))
        setLastPage(data.last_page)
        setTotal(data.total)
      })
      .catch((err) => { if (!ignore) setError(err.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [token, productId, reason, page])

  // Changing a filter starts again from page 1
  function setFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setLoading(true)
    setPage(1)
    setSearchParams(next, { replace: true })
  }

  function loadMore() {
    setLoading(true)
    setPage((p) => p + 1)
  }

  const productName = products.find((p) => String(p.id) === productId)?.name

  return (
    <section className="orders">
      <AdminNav />
      <h2 className="section-title">Stock history 📜</h2>
      <Link to="/admin/stock" className="dash-link">← Back to stock levels</Link>

      <div className="admin-toolbar history-filters">
        <select value={productId} onChange={(e) => setFilter('product', e.target.value)} aria-label="Product">
          <option value="">All products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={reason} onChange={(e) => setFilter('reason', e.target.value)} aria-label="Reason">
          <option value="">All changes</option>
          {Object.entries(STOCK_REASONS).map(([key, r]) => <option key={key} value={key}>{r.emoji} {r.label}</option>)}
        </select>
        <span className="order-date">{total} change{total === 1 ? '' : 's'}{productName ? ` for ${productName}` : ''}</span>
      </div>

      {error && <p className="empty-note">{error}</p>}
      {!loading && !error && entries.length === 0 && <p className="empty-note">No stock changes found.</p>}

      <div className="dash-card">
        <div className="table-scroll">
          <table className="data-table history-table">
            <thead>
              <tr><th>When</th>{!productId && <th>Product</th>}<th>Change</th><th className="num">Stock after</th><th>Why</th></tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const r = STOCK_REASONS[entry.reason] ?? { label: entry.reason, emoji: '•' }
                return (
                  <tr key={entry.id}>
                    <td className="order-date">{formatDate(entry.created_at)}</td>
                    {!productId && <td>{entry.product_name}</td>}
                    <td>
                      <span className={entry.quantity > 0 ? 'change change-up' : entry.quantity < 0 ? 'change change-down' : 'change'}>
                        {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                      </span>
                    </td>
                    <td className="num">{entry.stock_after}</td>
                    <td>
                      {r.emoji} {r.label}
                      {entry.order && <> · <strong>{entry.order.order_number}</strong></>}
                      {entry.user && <span className="order-date"> · by {entry.user.name}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {page < lastPage && (
          <button className="btn load-more" onClick={loadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        )}
        {loading && page === 1 && <p className="empty-note">Loading history...</p>}
      </div>
    </section>
  )
}

export default AdminStockHistory
