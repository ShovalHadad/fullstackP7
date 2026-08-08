import { createContext,useState,useEffect,useRef,} from 'react'

import {apiRequest,setToken,clearToken,getToken,} from '../services/api'

import { clearCache } from '../services/cache'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] =
    useState(true)

  const abortControllerRef = useRef(null)

  /*
  Restores the authenticated user after a page refresh.
  */
  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    const controller =
      new AbortController()

    abortControllerRef.current =
      controller

    apiRequest('/auth/me', {
      signal: controller.signal,
    })
      .then((data) => {
        setUser(data.user)
      })
      .catch((error) => {
        if (
          error.name === 'AbortError'
        ) {
          return
        }

        clearToken()
        clearCache()
        setUser(null)
      })
      .finally(() => {
        if (
          !controller.signal.aborted
        ) {
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
  async function login(
    email,
    password
  ) {
    clearCache()

    const data = await apiRequest(
      '/auth/login',
      {
        method: 'POST',
        body: {
          email,
          password,
        },
      }
    )

    setToken(data.token)
    setUser(data.user)

    return data.user
  }

  /*
  Registers a user and clears cached data from
  any previous authentication session.
  */
  async function register(
    fullName,
    username,
    email,
    password
  ) {
    clearCache()

    const data = await apiRequest(
      '/auth/register',
      {
        method: 'POST',
        body: {
          fullName,
          username,
          email,
          password,
        },
      }
    )

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
    setUser(null)
  }

  /*
  Updates the authenticated user without losing
  fields that were not included in the response.
  */
  function updateUser(
    updatedFields
  ) {
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

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  )
}