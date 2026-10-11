const API = import.meta.env.VITE_API_URL

// One place to talk to Laravel from the admin pages.
//   apiRequest('/api/admin/products', { token })                          → GET
//   apiRequest(url, { token, method: 'PATCH', json: { in_stock: false } }) → JSON body
//   apiRequest(url, { token, method: 'POST', formData })                   → with a photo
// Returns Laravel's JSON reply, or throws an Error with a message ready for a toast.
export async function apiRequest(path, { method = 'GET', token, json, formData } = {}) {
  let response
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        // No Content-Type for FormData: the browser adds it (with the file boundary) itself
        ...(json && { 'Content-Type': 'application/json' }),
      },
      body: json ? JSON.stringify(json) : formData,
    })
  } catch {
    throw new Error("Can't reach Yummiii right now.")   // offline / Laravel down
  }

  if (response.status === 204) return null              // 204 = done, nothing to send back
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.')
  return data
}

// Downloads a file (e.g. the Excel report). A plain link can't send the login token,
// so we fetch the file ourselves and then "click" a temporary link to save it.
export async function apiDownload(path, { token }, fileName) {
  let response
  try {
    response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new Error("Can't reach Yummiii right now.")
  }
  if (!response.ok) throw new Error('Could not create the file. Please try again.')

  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)   // free the memory
}

