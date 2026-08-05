import { createContext, useState, useEffect, useRef } from 'react'
import { apiRequest, setToken, clearToken, getToken } from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const abortControllerRef = useRef(null)

  /*
  React StrictMode runs this effect twice in development (mount ->
  cleanup -> mount). Aborting the first request in the cleanup function
  stops it before it ever reaches the network, so only the second,
  real mount ends up calling /auth/me.
  */
  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    apiRequest('/auth/me', { signal: controller.signal })
      .then((data) => setUser(data.user))
      .catch((err) => {
        if (err.name === 'AbortError') return
        clearToken()
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    setToken(data.token)
    setUser(data.user)
  }

  async function register(fullName, username, email, password) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { fullName, username, email, password },
    })
    setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  function updateUser(updatedFields) {
    setUser({ ...user, ...updatedFields })
  }

  const value = { user, isLoading, login, register, logout, updateUser }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
