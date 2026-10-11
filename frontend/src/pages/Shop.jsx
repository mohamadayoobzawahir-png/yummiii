import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import ProductCard from '../components/ProductCard'
import { useFetch } from '../hooks/useFetch'

function Shop() {
  const { category } = useParams()                      // /shop/cakes → 'cakes'
  const [searchParams, setSearchParams] = useSearchParams()   // /shop?offers=1&sort=popular
  const { data: products, loading, error } = useFetch('/api/products')
  const { data: categories } = useFetch('/api/categories')

  // What the customer typed / chose. The Home page links can preset sort and offers.
  const [search, setSearch] = useState('')
  const sort = searchParams.get('sort') ?? 'default'   // 'default' | 'low' | 'high' | 'popular'
  const offersOnly = searchParams.get('offers') === '1'

  // Keep sort/offers in the URL, so the page can be shared and the Back button works
  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  if (loading) {
    return (
      <section className="products">
        <h2 className="section-title">Loading treats...</h2>
        <div className="dots">
          <span></span><span></span><span></span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="products">
        <h2 className="section-title">{error}</h2>
        <button className="btn" onClick={() => window.location.reload()}>Try Again</button>
      </section>
    )
  }

  // Derived data: calculated on every render, never stored
  // products → category → offers → search → sort
  const currentCategory = categories?.find((c) => c.slug === category)
  const byCategory = category ? products.filter((p) => p.category?.slug === category) : products
  const byOffer = offersOnly ? byCategory.filter((p) => p.offer_price !== null) : byCategory
  const bySearch = byOffer.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  // .sort() changes the array it's called on, so sort a copy, never state itself
  let visibleProducts = bySearch
  if (sort === 'low') visibleProducts = [...bySearch].sort((a, b) => a.final_price - b.final_price)
  if (sort === 'high') visibleProducts = [...bySearch].sort((a, b) => b.final_price - a.final_price)
  if (sort === 'popular') visibleProducts = [...bySearch].sort((a, b) => b.sold_count - a.sold_count)

  const title = currentCategory
    ? `${currentCategory.emoji ?? ''} ${currentCategory.name}`
    : offersOnly ? '🔥 Offers' : 'Our Yummy Treats'

  return (
    <section className="products">
      <h2 className="section-title">{title}</h2>

      <div className="shop-toolbar">
        <input
          type="search"
          placeholder="🔍 Search treats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sort} onChange={(e) => updateParam('sort', e.target.value === 'default' ? null : e.target.value)}>
          <option value="default">Recommended</option>
          <option value="popular">Best selling</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
        <button
          className={offersOnly ? 'filter-btn active' : 'filter-btn'}
          onClick={() => updateParam('offers', offersOnly ? null : '1')}
          aria-pressed={offersOnly}
        >
          🏷️ Offers only
        </button>
      </div>

      {visibleProducts.length === 0 && <p>No treats found 🍩</p>}

      <div className="product-grid">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  )
}

export default Shop
