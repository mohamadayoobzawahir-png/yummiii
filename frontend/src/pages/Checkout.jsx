import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { useCart } from '../context/useCart'
import { useToast } from '../context/useToast'

const emptyForm = { name: '', phone: '', area: '', address: '', notes: '' }

// Returns an object of error messages. Empty object = everything is valid.
function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Please enter your name'
  if (!/^07\d{8}$/.test(form.phone)) errors.phone = 'Enter a 10-digit mobile number starting with 07'
  if (!form.area) errors.area = 'Please choose your area'
  if (!form.address.trim()) errors.address = 'Please enter your delivery address'
  return errors
}

function Checkout() {
  const { items, cartTotal, clearCart } = useCart()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [deliveryAreas, setDeliveryAreas] = useState([])
  const [submitting, setSubmitting] = useState(false)    // true while waiting for Laravel

  // Load the towns + fees from Laravel once, like Shop loads products
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/delivery-areas`)
      .then((response) => response.json())
      .then((data) => setDeliveryAreas(data))
  }, [])

  // One handler for every input: the input's `name` decides which field changes
  function handleChange(e) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Derived values: calculated from state on every render, never stored
  // <select> gives text ("2"), Laravel gives a number (2), so compare as text
  const selectedArea = deliveryAreas.find((area) => String(area.id) === form.area)
  const deliveryFee = selectedArea ? selectedArea.fee : 0
  const total = cartTotal + deliveryFee

  function handleSubmit(e) {
    e.preventDefault()
    const newErrors = validate(form)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {         // has errors → stop here
      showToast('Please fix the highlighted fields.', 'error')
      return
    }

    setSubmitting(true)

    // Only WHAT and HOW MANY: Laravel looks up the real prices 🔒
    const orderData = {
      customer_name: form.name,
      phone: form.phone,
      delivery_area_id: Number(form.area),
      address: form.address,
      notes: form.notes,
      items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    }

    fetch(`${import.meta.env.VITE_API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',   // we're sending JSON
        'Accept': 'application/json',         // reply in JSON, even for errors
      },
      body: JSON.stringify(orderData),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.message)   // Laravel's error message
        return data
      })
      .then((order) => {
        clearCart()
        showToast(`Order ${order.order_number} placed! 🎉`)
        navigate('/order-success', { state: { order } })   // the SAVED order from Laravel
      })
      .catch((error) => {
        // fetch throws a TypeError when it can't reach the server at all
        showToast(error instanceof TypeError
          ? "Can't reach Yummiii right now. Please check your internet and try again."
          : error.message, 'error')
      })
      .finally(() => setSubmitting(false))
  }

  if (items.length === 0) {
    return (
      <section className="cart">
        <h2 className="section-title">Your cart is empty 🛒</h2>
        <Link to="/shop" className="btn">Browse treats</Link>
      </section>
    )
  }

  return (
    <section className="checkout">
      <form className="checkout-form" onSubmit={handleSubmit} noValidate>
        <h2 className="section-title">Delivery details</h2>

        <label>
          Full name
          <input name="name" value={form.name} onChange={handleChange} />
        </label>
        {errors.name && <p className="error">{errors.name}</p>}

        <label>
          Phone
          <input name="phone" type="tel" inputMode="numeric" placeholder="07XXXXXXXX"
            value={form.phone} onChange={handleChange} />
        </label>
        {errors.phone && <p className="error">{errors.phone}</p>}

        <label>
          Area
          <select name="area" value={form.area} onChange={handleChange}>
            <option value="">Choose your area</option>
            {deliveryAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name} — {area.fee === 0 ? 'Free delivery' : `Rs. ${area.fee}`}
              </option>
            ))}
          </select>
        </label>
        {errors.area && <p className="error">{errors.area}</p>}

        <label>
          Address
          <textarea name="address" rows="3" value={form.address} onChange={handleChange} />
        </label>
        {errors.address && <p className="error">{errors.address}</p>}

        <label>
          Delivery notes <span className="optional">(optional)</span>
          <textarea name="notes" rows="2" placeholder="e.g. Call when you arrive"
            value={form.notes} onChange={handleChange} />
        </label>

        <div className="payment-box">
          💵 <strong>Cash on Delivery</strong>: pay when your order arrives
        </div>

        <button type="submit" className="btn btn-cta" disabled={submitting}>
          {submitting ? 'Placing order...' : `Place Order · Rs. ${total.toLocaleString()}`}
        </button>
      </form>

      <aside className="order-summary">
        <h3>Order summary</h3>
        {items.map((item) => (
          <p className="summary-row" key={item.id}>
            <span>{item.name} × {item.quantity}</span>
            <span>Rs. {(item.price * item.quantity).toLocaleString()}</span>
          </p>
        ))}
        <hr />
        <p className="summary-row"><span>Subtotal</span><span>Rs. {cartTotal.toLocaleString()}</span></p>
        <p className="summary-row">
          <span>Delivery</span>
          <span>{!selectedArea ? 'Choose area' : deliveryFee === 0 ? 'Free 🎉' : `Rs. ${deliveryFee}`}</span>
        </p>
        <p className="summary-row summary-total"><span>Total</span><span>Rs. {total.toLocaleString()}</span></p>
      </aside>
    </section>
  )
}

export default Checkout