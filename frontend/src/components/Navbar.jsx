import { useState } from 'react'
import logo from '../assets/logo.jpg'
import { Link } from 'react-router'
import { useCart } from '../context/useCart'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import { useFetch } from '../hooks/useFetch'

function Navbar() {
  const [isOpen, setIsOpen] = useState(false)   // menu starts closed

  const { cartCount } = useCart()
  const { user, logout } = useAuth()
  const { showToast } = useToast()
  const { data: categories } = useFetch('/api/categories')   // managed in Admin → Categories

  // Fixed links + one link per category that has products
  const links = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    ...(categories ?? [])
      .filter((category) => category.products_count > 0)
      .map((category) => ({ label: category.name, to: `/shop/${category.slug}` })),
    { label: '📦 Track Order', to: '/track-order' },
  ]

  async function handleLogout() {
    setIsOpen(false)
    try {
      await logout()
    } catch {
      // Laravel unreachable: logout() still forgot the token on this device, so carry on
    }
    showToast('You have been logged out. See you soon! 👋')
  }

  return (
    <nav className="navbar">
      <Link to="/"><img src={logo} alt="Yummiii logo" width="60" /></Link>

      <Link to="/cart" className="cart-link">
        🛒 <span className="cart-badge">{cartCount}</span>
      </Link>

      <button
        className="menu-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <div className={isOpen ? 'nav-links open' : 'nav-links'}>
        {links.map((link) => (
          <Link to={link.to} key={link.to} onClick={() => setIsOpen(false)}>
            {link.label}
          </Link>
        ))}

        {/* Only a logged-in admin sees these (2 things, so a fragment wraps them).
            Customers don't log in; admins go to /admin/login directly. */}
        {user && (
          <>
            <Link to="/admin" onClick={() => setIsOpen(false)}>🛠️ Admin</Link>
            <button className="link-btn" onClick={handleLogout}>Logout</button>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
