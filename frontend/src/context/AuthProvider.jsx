import { useState, useEffect } from 'react'
import { AuthContext } from './AuthContext'

const API = import.meta.env.VITE_API_URL

// Sends JSON to Laravel and returns the reply. Throws Laravel's message on errors
// (e.g. "The email or password is incorrect.") so pages can show it.
async function postJson(url, body, token) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  })
  const data = response.status === 204 ? null : await response.json()   // 204 = no content
  if (!response.ok) {
    const error = new Error(data.message)
    error.fields = data.errors ?? {}   // per-field messages, e.g. { email: ['The email has already been taken.'] }
    throw error
  }
  return data
}

function AuthProvider({ children }) {
  // TODO 1: LOAD the token once, when the app starts (same idea as the cart)
  const [token, setToken] = useState(() => localStorage.getItem('yummiii-token'))
  const [user, setUser] = useState(null)

  // TODO 2: SAVE the token every time it changes (or remove it on logout)
  useEffect(() => {
    if (token) localStorage.setItem('yummiii-token', token)
    else localStorage.removeItem('yummiii-token')
  }, [token])

  // On page load: we have a token but no user yet → ask Laravel "who am I?"
  useEffect(() => {
    if (!token) return
    fetch(`${API}/api/user`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error()   // token expired or logged out elsewhere
        return response.json()
      })
      .then((data) => setUser(data))
      .catch(() => setToken(null))            // bad token → forget it
  }, [token])

  // TODO 3: log in → keep the token (wristband) and the user
  async function login(email, password) {
    const data = await postJson(`${API}/api/login`, { email, password })
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  // TODO 4: log out → tell Laravel to destroy the token, then forget it here
  async function logout() {
    try {
      await postJson(`${API}/api/logout`, {}, token)
    } finally {
      // runs even if Laravel is down: the customer is always logged out on this device
      setToken(null)
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
