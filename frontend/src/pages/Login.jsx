import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '../context/useAuth'
import { useToast } from '../context/useToast'
import { useFetch } from '../hooks/useFetch'

function Login() {
  const { login } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/admin'   // where to go after logging in

  // TODO 1: one state per thing that can change on this page
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { data: config } = useFetch('/api/config')   // demo copy → show the demo login

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // TODO 2: wait for Laravel; if this line throws, we jump straight to catch
      const user = await login(email, password)
      showToast(`Welcome back, ${user.name}! 🛠️`)
      navigate(from, { replace: true })   // replace: Back button won't return to this form
    } catch (err) {
      // TODO 3: e.g. "The email or password is incorrect."
      // err.fields only exists when Laravel replied; otherwise the server couldn't be reached
      showToast(err.fields ? err.message : "Can't reach Yummiii right now.", 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="checkout auth">
      <form className="checkout-form" onSubmit={handleSubmit}>
        <h2 className="section-title">Admin login 🛠️</h2>

        {config?.demo && (
          <div className="demo-login">
            <p>👋 <strong>Recruiter or visitor?</strong> Explore the admin panel with the demo account:</p>
            <p><code>{config.demo_email}</code> / <code>{config.demo_password}</code></p>
            <button type="button" className="btn btn-light"
              onClick={() => { setEmail(config.demo_email); setPassword(config.demo_password) }}>
              Fill in demo login
            </button>
          </div>
        )}

        {/* TODO 4 */}
        <label>
          Email
          <input type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        {/* TODO 5 */}
        <label>
          Password
          <input type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {/* TODO 6 */}
        <button type="submit" className="btn btn-cta" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    </section>
  )
}

export default Login
