import { Link } from 'react-router'
import { useFetch } from '../hooks/useFetch'

// Only on the portfolio demo copy (DEMO_MODE=true in Laravel): a strip above the Navbar,
// so nobody mistakes the demo for the real shop. The real shop shows nothing here.
function DemoBanner() {
  const { data: config } = useFetch('/api/config')
  if (!config?.demo) return null

  return (
    <div className="demo-banner" role="note">
      👀 <strong>Demo shop</strong> for my portfolio: orders aren't real and everything resets every night.{' '}
      <Link to="/admin/login">Try the admin panel →</Link>
    </div>
  )
}

export default DemoBanner
