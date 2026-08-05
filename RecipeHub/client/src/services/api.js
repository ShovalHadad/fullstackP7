const BASE_URL = 'http://localhost:3001/api'

const TOKEN_KEY = 'recipehub_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

/*
The optional `signal` (from an AbortController) lets callers cancel a
request that is no longer needed - e.g. when a component unmounts, or
when its dependencies change before the previous fetch finished. This
is what allows effects to stay correct under React StrictMode's
mount -> cleanup -> mount cycle without duplicate network calls.
*/
export async function apiRequest(
  endpoint,
  { method = 'GET', body, isFormData = false, signal } = {}
) {
  const headers = {}

  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    signal,
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    /*
    Attaching the HTTP status lets callers distinguish, for example,
    a 404 "not found" (an expected, normal outcome for some GET
    requests) from a real network/server error, without every
    component needing its own status-parsing logic.
    */
    const error = new Error(result.message || 'Something went wrong')
    error.status = response.status
    throw error
  }

  return result.data
}
