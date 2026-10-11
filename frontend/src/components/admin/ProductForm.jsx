import { useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { useToast } from '../../context/useToast'
import { apiRequest } from '../../api'

const MAX_PHOTO_MB = 5

// Add a new product (product = null) or edit an existing one.
// The parent decides what happens after saving (onSaved) or cancelling (onCancel).
function ProductForm({ product, categories, onSaved, onCancel }) {
  const { token } = useAuth()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: product?.name ?? '',
    category_id: product?.category_id ?? categories[0]?.id ?? '',
    price: product?.price ?? '',
    offer_price: product?.offer_price ?? '',
    stock: product?.stock ?? 10,
  })
  const [photo, setPhoto] = useState(null)                       // the File the admin picked
  const [preview, setPreview] = useState(product?.image ?? null) // what the <img> shows
  const [saving, setSaving] = useState(false)

  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      showToast(`The photo is too big. Please choose one smaller than ${MAX_PHOTO_MB} MB.`, 'error')
      e.target.value = ''   // clear the file input
      return
    }
    setPhoto(file)
    // A temporary local address for the file, so we can show it BEFORE uploading
    setPreview(URL.createObjectURL(file))
  }

  // Live "-20%" next to the offer field (derived, not stored)
  const price = Number(form.price)
  const offer = Number(form.offer_price)
  const discount = price > 0 && offer > 0 && offer < price ? Math.round(100 - (offer * 100) / price) : 0

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)

    // FormData = a form that can carry files. Every value is sent as text.
    const body = new FormData()
    body.append('name', form.name)
    body.append('category_id', form.category_id)
    body.append('price', form.price)
    body.append('offer_price', form.offer_price)   // empty = no offer (Laravel turns '' into null)
    body.append('stock', form.stock)
    if (photo) body.append('image', photo)
    // PHP can't read files sent with PATCH, so we send POST and tell Laravel "treat this as PATCH"
    if (product) body.append('_method', 'PATCH')

    try {
      const saved = await apiRequest(
        product ? `/api/admin/products/${product.id}` : '/api/admin/products',
        { method: 'POST', token, formData: body },
      )
      onSaved(saved, product ? 'updated' : 'added')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="checkout-form product-form" onSubmit={handleSubmit}>
      <h3>{product ? `Edit ${product.name}` : 'Add a new product'}</h3>

      <div className="product-form-photo">
        {preview ? <img src={preview} alt="" /> : <div className="photo-empty">📷 No photo</div>}
        <label className="btn">
          {preview ? 'Change photo' : 'Choose photo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handlePhoto} />
        </label>
      </div>

      <label>
        Name
        <input name="name" required maxLength={100} value={form.name} onChange={handleChange} />
      </label>

      <label>
        Category
        <select name="category_id" required value={form.category_id} onChange={handleChange}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.emoji} {category.name}</option>
          ))}
        </select>
      </label>

      <div className="form-row">
        <label>
          Price (Rs.)
          <input name="price" type="number" min="1" required value={form.price} onChange={handleChange} />
        </label>
        <label>
          Offer price <span className="optional">(optional{discount > 0 ? ` · -${discount}%` : ''})</span>
          <input name="offer_price" type="number" min="1" placeholder="No offer"
            value={form.offer_price} onChange={handleChange} />
        </label>
        <label>
          Stock
          <input name="stock" type="number" min="0" required value={form.stock} onChange={handleChange} />
        </label>
      </div>

      <div className="order-actions">
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving...' : product ? 'Save changes' : 'Add product'}
        </button>
        <button type="button" className="btn btn-danger" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default ProductForm
