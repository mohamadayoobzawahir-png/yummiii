import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../context/useAuth'

// Guards admin pages: must be logged in AND an admin.
function AdminRoute({ children }) {
  const { token, user } = useAuth()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />
  }

  // After a refresh we have the token straight away, but the user arrives a moment later.
  // Wait for it — otherwise we'd wrongly send an admin away because user is still null.
  if (!user) {
    return (
      <section className="orders">
        <h2 className="section-title">Loading...</h2>
      </section>
    )
  }

  if (!user.is_admin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
