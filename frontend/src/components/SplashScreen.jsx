import { useState } from 'react'
import logo from '../assets/logo.jpg'

const SEEN_KEY = 'yummiii-splash-seen'

// Once per visit (per browser tab): the logo pops in on a green screen, then the shop fades in.
// Skipped for people whose device asks for less motion, and a tap skips it too.
function shouldShow() {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return !sessionStorage.getItem(SEEN_KEY)
  } catch {
    return false   // storage blocked (e.g. some private modes): just show the shop
  }
}

function SplashScreen() {
  const [visible, setVisible] = useState(shouldShow)

  function hide() {
    try { sessionStorage.setItem(SEEN_KEY, '1') } catch { /* fine: it just shows again next visit */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="splash"
      aria-hidden="true"
      onClick={hide}
      // Several animations run inside; only the overlay's own fade-out ends the splash
      onAnimationEnd={(e) => { if (e.animationName === 'splash-out') hide() }}
    >
      <img src={logo} alt="" className="splash-logo" />
      <div className="splash-dots"><span></span><span></span><span></span></div>
    </div>
  )
}

export default SplashScreen
