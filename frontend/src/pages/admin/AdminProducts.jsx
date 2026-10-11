import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { apiRequest } from '../../api'
import AdminNav from '../../components/admin/AdminNav'
import ProductForm from '../../components/admin/ProductForm'
import { LOW_STOCK } from '../../data/stock'

function AdminProducts() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)   // null = no form, 'new' = add form, a product = edit form
  const [busyId, setBusyId] = useState(null)     // which product's button is working
  const [categories, setCategories] = useState([])

  useEffect(() => {
    // Load products AND categories at the same time
    Promise.all([
      apiRequest('/api/admin/products', { token }),
      apiRequest('/api/admin/categories', { token }),
    ])
      .then(([productData, categoryData]) => {
        setProducts(productData)
        setCategories(categoryData)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  // After the form saves: replace the product if it was in the list, otherwise add it on top
  function handleSaved(saved, action) {
    setProducts((prev) =>
      prev.some((p) => p.id === saved.id)
        ? prev.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...prev],
    )
    setEditing(null)
    showToast(`${saved.name} ${action} ✅`)
  }

  // Quick stock buttons: set an exact number (0 = sold out) without opening the form
  async function setStock(product, stock) {
    setBusyId(product.id)
    try {
      const saved = await apiRequest(`/api/admin/products/${product.id}`, {
        method: 'PATCH', token, json: { stock },
      })
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)))
      showToast(saved.stock === 0 ? `${saved.name} is now out of stock` : `${saved.name}: ${saved.stock} in stock`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}? This can't be undone.`)) return
    setBusyId(product.id)
    try {
      await apiRequest(`/api/admin/products/${product.id}`, { method: 'DELETE', token })
      setProducts((prev) => prev.filter((p) => p.id !== product.id))
      showToast(`${product.name} deleted`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) {
    return (
      <section className="orders">
        <AdminNav />
        <h2 className="section-title">Loading products...</h2>
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

  return (
    <section className="orders">
      <AdminNav />
      <h2 className="section-title">Products 🍰</h2>

      {editing ? (
        // key: switching from one product to another gives a FRESH form (its state starts over)
        <ProductForm
          key={editing === 'new' ? 'new' : editing.id}
          product={editing === 'new' ? null : editing}
          categories={categories}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      ) : (
        categories.length > 0
          ? <button className="btn btn-add-product" onClick={() => setEditing('new')}>➕ Add product</button>
          : <p className="empty-note">Add a category first (🗂️ Categories tab), then you can add products.</p>
      )}

      <div className="admin-products">
        {products.map((product) => (
          <article className={product.in_stock ? 'admin-product' : 'admin-product sold-out'} key={product.id}>
            <img src={product.image || 'https://placehold.co/160x120?text=No+photo'} alt={product.name} />
            <div className="admin-product-info">
              <h3>{product.name}</h3>
              <p className="order-date">
                {product.category?.emoji} {product.category?.name} · Rs. {product.final_price.toLocaleString()}
                {product.offer_price !== null && <> <s>Rs. {product.price.toLocaleString()}</s> <strong className="low-stock">-{product.discount_percent}%</strong></>}
              </p>
              <p className="order-date">🔥 {product.sold_count} sold</p>
              <span className={!product.in_stock ? 'status status-cancelled' : product.stock <= LOW_STOCK ? 'status status-pending' : 'status status-delivered'}>
                {!product.in_stock ? 'Out of stock' : product.stock <= LOW_STOCK ? `Low: ${product.stock} left` : `${product.stock} in stock`}
              </span>
            </div>
            <div className="admin-product-actions">
              <button className="btn" disabled={busyId === product.id} onClick={() => setEditing(product)}>
                ✏️ Edit
              </button>
              <button className="btn" disabled={busyId === product.id} onClick={() => setStock(product, product.stock + 10)}>
                ➕ Add 10 stock
              </button>
              {product.in_stock && (
                <button className="btn" disabled={busyId === product.id} onClick={() => setStock(product, 0)}>
                  🚫 Sold out
                </button>
              )}
              <button className="btn btn-danger" disabled={busyId === product.id} onClick={() => deleteProduct(product)}>
                🗑️ Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AdminProducts
