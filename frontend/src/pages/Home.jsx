import { Link } from 'react-router'
import logo from '../assets/logo.jpg'
import ProductCard from '../components/ProductCard'
import { useFetch } from '../hooks/useFetch'

const ROW_SIZE = 4   // products shown per row on the Home page

// In-stock products first, so the Home page never opens with "Out of Stock"
const inStockFirst = (a, b) => Number(b.in_stock) - Number(a.in_stock)

function Home() {
  const { data: products, loading, error } = useFetch('/api/products')
  const { data: categories } = useFetch('/api/categories')

  // Derived lists (calculated from the data, never stored in state)
  const all = products ?? []
  const offers = all.filter((p) => p.offer_price !== null).sort(inStockFirst).slice(0, ROW_SIZE)
  const bestSellers = all
    .filter((p) => p.sold_count > 0)
    .sort((a, b) => b.sold_count - a.sold_count)
    .slice(0, ROW_SIZE)
  const filledCategories = (categories ?? []).filter((c) => c.products_count > 0)

  return (
    <>
      <section className="hero">
        <img src={logo} alt="Yummiii logo" width="200" className="hero-logo" />
        <h1>Welcome to Yummiii!</h1>
        <p>Cakes, fast food and sweets, delivered to your door.</p>
        <div className="dots">
          <span></span><span></span><span></span>
        </div>
        <Link to="/shop" className="btn btn-cta">
          Shop Now
        </Link>
        <p className="home-track">
          Already ordered? <Link to="/track-order">Track your order 📦</Link>
        </p>
      </section>

      {loading && <p className="empty-note home-loading">Loading treats...</p>}
      {error && <p className="empty-note home-loading">{error}</p>}

      {filledCategories.length > 0 && (
        <section className="home-section">
          <h2 className="section-title">Shop by Category</h2>
          <div className="category-grid">
            {filledCategories.map((category) => (
              <Link to={`/shop/${category.slug}`} className="category-card" key={category.id}>
                <span className="category-emoji">{category.emoji || '🍽️'}</span>
                <strong>{category.name}</strong>
                <span>{category.products_count} {category.products_count === 1 ? 'item' : 'items'}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {offers.length > 0 && (
        <section className="home-section home-offers">
          <div className="row-head">
            <h2>🔥 Today's Offers</h2>
            <Link to="/shop?offers=1">See all offers →</Link>
          </div>
          <div className="product-grid">
            {offers.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section className="home-section">
          <div className="row-head">
            <h2>⭐ Best Sellers</h2>
            <Link to="/shop?sort=popular">See all →</Link>
          </div>
          <div className="product-grid">
            {bestSellers.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </section>
      )}

      {/* One row per category, with its first few products */}
      {filledCategories.map((category) => {
        const items = all.filter((p) => p.category_id === category.id).sort(inStockFirst)
        if (items.length === 0) return null
        return (
          <section className="home-section" key={category.id}>
            <div className="row-head">
              <h2>{category.emoji} {category.name}</h2>
              <Link to={`/shop/${category.slug}`}>See all {items.length} →</Link>
            </div>
            <div className="product-grid">
              {items.slice(0, ROW_SIZE).map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </section>
        )
      })}
    </>
  )
}

export default Home
