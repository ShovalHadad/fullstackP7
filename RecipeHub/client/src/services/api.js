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

export async function apiRequest(endpoint, { method = 'GET', body, isFormData = false } = {}) {
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
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Something went wrong')
  }

  return result.data
}
