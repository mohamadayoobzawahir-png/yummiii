import { useState, useEffect } from 'react'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { apiRequest } from '../../api'
import AdminNav from '../../components/admin/AdminNav'

const emptyForm = { name: '', emoji: '' }

function AdminCategories() {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useState(emptyForm)            // the "add" form
  const [editingId, setEditingId] = useState(null)       // which row is being edited
  const [editForm, setEditForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiRequest('/api/admin/categories', { token })
      .then((data) => setCategories(data))
      .catch((err) => setError(err.message))   // not a toast: showToast changes on every toast → loop
      .finally(() => setLoading(false))
  }, [token])

  async function addCategory(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const saved = await apiRequest('/api/admin/categories', { method: 'POST', token, json: form })
      setCategories((prev) => [...prev, saved])
      setForm(emptyForm)
      showToast(`${saved.name} added ✅`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  function startEdit(category) {
    setEditingId(category.id)
    setEditForm({ name: category.name, emoji: category.emoji ?? '' })
  }

  async function saveEdit(category) {
    setBusy(true)
    try {
      const saved = await apiRequest(`/api/admin/categories/${category.id}`, { method: 'PATCH', token, json: editForm })
      setCategories((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
      setEditingId(null)
      showToast(`${saved.name} saved ✅`)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  // Swap places with the category above (-1) or below (+1)
  async function move(index, direction) {
    const a = categories[index]
    const b = categories[index + direction]
    if (!b) return
    setBusy(true)
    try {
      const [savedA, savedB] = await Promise.all([   // send both changes at the same time
        apiRequest(`/api/admin/categories/${a.id}`, { method: 'PATCH', token, json: { sort_order: index + direction } }),
        apiRequest(`/api/admin/categories/${b.id}`, { method: 'PATCH', token, json: { sort_order: index } }),
      ])
      setCategories((prev) => {
        const next = prev.map((c) => (c.id === savedA.id ? savedA : c.id === savedB.id ? savedB : c))
        return next.sort((x, y) => x.sort_order - y.sort_order)
      })
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Delete the ${category.name} category?`)) return
    setBusy(true)
    try {
      await apiRequest(`/api/admin/categories/${category.id}`, { method: 'DELETE', token })
      setCategories((prev) => prev.filter((c) => c.id !== category.id))
      showToast(`${category.name} deleted`)
    } catch (err) {
      showToast(err.message, 'error')   // e.g. "Move or delete the 2 product(s) in Cakes first."
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="orders">
      <AdminNav />
      <h2 className="section-title">Categories 🗂️</h2>

      <form className="checkout-form product-form category-add" onSubmit={addCategory}>
        <h3>Add a category</h3>
        <div className="category-fields">
          <label className="emoji-field">
            Emoji
            <input value={form.emoji} maxLength={8} placeholder="🥟"
              onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
          </label>
          <label>
            Name
            <input value={form.name} required maxLength={50} placeholder="e.g. Short Eats"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
        </div>
        <button className="btn" disabled={busy}>➕ Add category</button>
      </form>

      {loading && <p className="empty-note">Loading categories...</p>}
      {error && <p className="empty-note">{error}</p>}

      <div className="admin-products">
        {categories.map((category, index) => (
          <article className="admin-product" key={category.id}>
            {editingId === category.id ? (
              <div className="category-fields">
                <label className="emoji-field">
                  Emoji
                  <input value={editForm.emoji} maxLength={8}
                    onChange={(e) => setEditForm({ ...editForm, emoji: e.target.value })} />
                </label>
                <label>
                  Name
                  <input value={editForm.name} maxLength={50}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </label>
              </div>
            ) : (
              <div className="admin-product-info">
                <h3>{category.emoji || '🍽️'} {category.name}</h3>
                <p className="order-date">/shop/{category.slug} · {category.products_count} product(s)</p>
              </div>
            )}

            <div className="admin-product-actions">
              {editingId === category.id ? (
                <>
                  <button className="btn" disabled={busy} onClick={() => saveEdit(category)}>💾 Save</button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <button className="btn" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label="Move up">⬆️</button>
                  <button className="btn" disabled={busy || index === categories.length - 1} onClick={() => move(index, 1)} aria-label="Move down">⬇️</button>
                  <button className="btn" disabled={busy} onClick={() => startEdit(category)}>✏️ Edit</button>
                  <button className="btn btn-danger" disabled={busy} onClick={() => deleteCategory(category)}>🗑️ Delete</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default AdminCategories
