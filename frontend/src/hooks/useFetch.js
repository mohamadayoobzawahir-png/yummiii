import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL

// A custom hook: the "loading → data / error" pattern from Shop, packed into one line.
//   const { data, loading, error } = useFetch('/api/products')
// Custom hooks are just functions whose names start with "use" and that use other hooks.
export function useFetch(path) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false   // set to true if the component disappears before the reply arrives

    fetch(`${API}${path}`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error('Server error')
        return response.json()
      })
      .then((result) => { if (!ignore) setData(result) })
      .catch(() => { if (!ignore) setError("Couldn't load treats 😢 Please try again later.") })
      .finally(() => { if (!ignore) setLoading(false) })

    // Cleanup: runs when the component leaves the screen → don't update state it no longer has
    return () => { ignore = true }
  }, [path])

  return { data, loading, error }
}
