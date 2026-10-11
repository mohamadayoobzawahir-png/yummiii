import { Link } from 'react-router'
import { useCart } from '../context/useCart'
import { useToast } from '../context/useToast'

function Cart() {
  const { items, removeFromCart, increaseQty, decreaseQty, cartTotal } = useCart()
  const { showToast } = useToast()

  function handleIncrease(item) {
    if (!increaseQty(item.id)) showToast(`Sorry, only ${item.stock} × ${item.name} available.`, 'error')
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
    <section className="cart">
      <h2 className="section-title">Your Cart 🛒</h2>

      {items.map((item) => (
        <div className="cart-item" key={item.id}>
          <img src={item.image} alt={item.name} />
          <div className="cart-item-info">
            <h3>{item.name}</h3>
            <p>Rs. {item.price.toLocaleString()}</p>
          </div>
          <div className="qty">
            <button onClick={() => decreaseQty(item.id)}>−</button>
            <span>{item.quantity}</span>
            <button onClick={() => handleIncrease(item)}>+</button>
          </div>
          <p className="line-total">Rs. {(item.price * item.quantity).toLocaleString()}</p>
          <button className="remove" onClick={() => removeFromCart(item.id)} aria-label="Remove">🗑️</button>
        </div>
      ))}

      <div className="cart-summary">
        <p>Total: <strong>Rs. {cartTotal.toLocaleString()}</strong></p>
        <Link to="/checkout" className="btn btn-cta">Proceed to Checkout (Cash on Delivery) 💵</Link>
      </div>
    </section>
  )
}

export default Cart
