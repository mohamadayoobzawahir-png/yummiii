import { useState } from 'react'
import { ToastContext } from './ToastContext'

let nextId = 1   // each toast needs a unique key

// Pop-up messages at the top of the screen. Any component can call:
//   const { showToast } = useToast()
//   showToast('Added to cart')              → green ✅
//   showToast('Something broke', 'error')   → red ⚠️
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  function dismiss(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  function showToast(message, type = 'success') {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => dismiss(id), 3500)   // disappears by itself after 3.5 seconds
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* aria-live: screen readers read new messages out loud */}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            onClick={() => dismiss(toast.id)}   // tap to close early
          >
            {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export default ToastProvider
