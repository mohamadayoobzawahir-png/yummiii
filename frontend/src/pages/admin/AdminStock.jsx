import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { apiRequest } from '../../api'
import { LOW_STOCK, stockLevel } from '../../data/stock'
import AdminNav from '../../components/admin/AdminNav'

const LEVELS = {
  out: { label: 'Out of stock', emoji: '❌' },
  low: { label: 'Low', emoji: '⚠️' },
  ok:  { label: 'Healthy', emoji: '✅' },
}

function AdminStock() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')       // 'all' | 'out' | 'low' | 'ok'
  const [search, setSearch] = useState('')
  const [amounts, setAmounts] = useState({})        // what's typed in each "Set stock" box, by product id
  const [busyId, setBusyId] = useState(null)
  const [updates, setUpdates] = useState(0)         // tells AdminNav to refresh its alert badge

  useEffect(() => {
    apiRequest('/api/admin/products', { token })
      .then((data) => setProducts(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  async function saveStock(product, stock) {
    if (!Number.isInteger(stock) || stock < 0) {
      showToast('Please enter a whole number, 0 or more.', 'error')
      return
    }
    setBusyId(product.id)
    try {
      const saved = await apiRequest(`/api/admin/products/${product.id}`, { method: 'PATCH', token, json: { stock } })
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
      setAmounts((prev) => ({ ...prev, [product.id]: '' }))
      setUpdates((n) => n + 1)
      showToast(saved.stock === 0 ? `${saved.name} is now out of stock` : `${saved.name}: ${saved.stock} in stock ✅`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading || error) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">{error ?? 'Loading stock...'}</h2>
      </section>
    )
  }

  // Derived: counts per level, then filter + search, most urgent (lowest stock) first
  const countOf = (level) => products.filter((p) => stockLevel(p.stock) === level).length
  const visible = products
    .filter((p) => filter === 'all' || stockLevel(p.stock) === filter)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.stock - b.stock)
  // Level bars are relative to the best-stocked product (at least 4× the low-stock line)
  const scale = Math.max(LOW_STOCK * 4, ...products.map((p) => p.stock))

  return (
    <section className="orders">
      <AdminNav refresh={updates} />
      <h2 className="section-title">Stock 📦</h2>

      <p className="stock-note">
        A product becomes <strong>Out of Stock automatically</strong> when it reaches 0, and comes back
        as soon as you add stock. <strong>{LOW_STOCK} or fewer</strong> left counts as low.
        {' '}<Link to="/admin/stock/history" className="dash-link">📜 See full stock history →</Link>
      </p>

      <div className="admin-toolbar">
        <div className="admin-filters">
          <button className={filter === 'all' ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilter('all')}>
            All <span className="count">{products.length}</span>
          </button>
          {Object.keys(LEVELS).map((level) => (
            <button key={level} className={filter === level ? 'filter-btn active' : 'filter-btn'} onClick={() => setFilter(level)}>
              {LEVELS[level].emoji} {LEVELS[level].label} <span className="count">{countOf(level)}</span>
            </button>
          ))}
        </div>
        <input className="stock-search" type="search" placeholder="🔍 Search products..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {visible.length === 0 && <p className="empty-note">Nothing here 🎉</p>}

      <div className="admin-products">
        {visible.map((product) => {
          const level = stockLevel(product.stock)
          return (
            <article className="admin-product stock-row" key={product.id}>
              <div className="admin-product-info">
                <h3>{product.name}</h3>
                <p className="order-date">{product.category?.emoji} {product.category?.name} · 🔥 {product.sold_count} sold</p>
                <div className="stock-meter" aria-hidden="true">
                  <div className={`stock-fill stock-${level}`} style={{ width: `${Math.min(product.stock / scale, 1) * 100}%` }} />
                </div>
                <span className={`stock-label stock-text-${level}`}>
                  {LEVELS[level].emoji} {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}{level === 'low' ? ': restock soon' : ''}
                </span>
              </div>

              <div className="admin-product-actions">
                <Link to={`/admin/stock/history?product=${product.id}`} className="btn btn-light">📜 History</Link>
                <button className="btn" disabled={busyId === product.id} onClick={() => saveStock(product, product.stock + 10)}>➕ 10</button>
                <form className="set-stock" onSubmit={(e) => { e.preventDefault(); saveStock(product, Number(amounts[product.id])) }}>
                  <input type="number" min="0" placeholder="Set to" aria-label={`Set stock for ${product.name}`}
                    value={amounts[product.id] ?? ''} onChange={(e) => setAmounts((prev) => ({ ...prev, [product.id]: e.target.value }))} />
                  <button className="btn" disabled={busyId === product.id || amounts[product.id] === undefined || amounts[product.id] === ''}>Save</button>
                </form>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default AdminStock
