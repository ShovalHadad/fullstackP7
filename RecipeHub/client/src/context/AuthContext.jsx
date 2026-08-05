import { createContext, useState, useEffect } from 'react'
import { apiRequest, setToken, clearToken, getToken } from '../services/api'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    apiRequest('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false))
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
