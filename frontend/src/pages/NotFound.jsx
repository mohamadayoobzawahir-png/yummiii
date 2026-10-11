import { Link } from 'react-router'

function NotFound() {
  return (
    <section className="hero">
      <h1>Oops! Page not found 🍩</h1>
      <p>This treat doesn't exist.</p>
      <Link to="/" className="btn">Back to Home</Link>
    </section>
  )
}

export default NotFound