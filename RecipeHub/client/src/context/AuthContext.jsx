import { createContext, useState, useEffect } from 'react'
import {
  apiGet,
  apiRequest,
  setToken,
  clearToken,
  getToken,
  clearInflightGets,
} from '../services/api'
import { clearCache } from '../services/cache'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /*
  Restores the authenticated user after a page refresh.

  Uses /auth/me (lightweight identity endpoint), NOT /profile.
  /profile is for the Profile page's editable data; /auth/me returns
  only the fields needed for auth/role checks across the app.
  */
  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    const controller = new AbortController()

    apiGet('/auth/me', { signal: controller.signal })
      .then((data) => {
        setUser(data.user)
      })
      .catch((error) => {
        if (error.name === 'AbortError') {
          return
        }

        clearToken()
        clearCache()
        clearInflightGets()
        setUser(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => {
      controller.abort()
    }
  }, [])

  /*
  Logs in a user and clears cached data that may belong
  to the previously authenticated account.
  */
  async function login(email, password) {
    clearCache()
    clearInflightGets()

    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email,
        password,
      },
    })

    setToken(data.token)
    setUser(data.user)

    return data.user
  }

  /*
  Registers a user and clears cached data from
  any previous authentication session.
  */
  async function register(fullName, username, email, password) {
    clearCache()
    clearInflightGets()

    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: {
        fullName,
        username,
        email,
        password,
      },
    })

    setToken(data.token)
    setUser(data.user)

    return data.user
  }

  /*
  Logs out and removes all account-specific cached data.
  */
  function logout() {
    clearToken()
    clearCache()
    clearInflightGets()
    setUser(null)
  }

  /*
  Updates the authenticated user without losing
  fields that were not included in the response.
  */
  function updateUser(updatedFields) {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser
      }

      return {
        ...currentUser,
        ...updatedFields,
      }
    })
  }

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
