import { useCart } from '../context/useCart'
import { useToast } from '../context/useToast'
import { LOW_STOCK } from '../data/stock'

function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { showToast } = useToast()
  const hasOffer = product.offer_price !== null
  const lowStock = product.in_stock && product.stock <= LOW_STOCK

  function handleAdd() {
    // The cart shows the price the customer pays (offer price if any). Laravel re-checks it.
    const added = addToCart({ ...product, price: product.final_price })
    if (added) showToast(`${product.name} added to cart 🛒`)
    else showToast(`Sorry, only ${product.stock} × ${product.name} available.`, 'error')
  }

  return (
    <div className="product-card">
      <div className="product-img">
        <img src={product.image || 'https://placehold.co/400x300?text=Yummiii'} alt={product.name} />
        {hasOffer && <span className="badge-offer">-{product.discount_percent}%</span>}
      </div>
      <div className="product-info">
        <span className="category">{product.category?.emoji} {product.category?.name}</span>
        <h3>{product.name}</h3>
        <p className="price">
          Rs. {product.final_price.toLocaleString()}
          {hasOffer && <s className="old-price">Rs. {product.price.toLocaleString()}</s>}
        </p>
        <p className="product-meta">
          {product.sold_count > 0 && <span>🔥 {product.sold_count} sold</span>}
          {lowStock && <span className="low-stock">Only {product.stock} left!</span>}
        </p>
        {product.in_stock ? (
          <button className="btn btn-add" onClick={handleAdd}>
            Add to Cart
          </button>
        ) : (
          <button className="btn btn-out-of-stock" disabled>
            Out of Stock
          </button>
        )}
      </div>
    </div>
  )
}

export default ProductCard
