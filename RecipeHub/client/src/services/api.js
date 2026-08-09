const BASE_URL = 'http://localhost:3001/api'

const TOKEN_KEY = 'recipehub_token'

/*
Tracks in-flight GET promises by endpoint.

React StrictMode (dev) mounts -> cleans up -> remounts. If each mount
starts its own fetch and aborts it on cleanup, the Network tab fills
with cancelled (red) requests. Sharing one promise per endpoint means
cleanup only drops the local waiter; the real HTTP request continues
and the remount joins it - one clean GET in the Network tab.
*/
const inflightGets = new Map()

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function clearInflightGets() {
  inflightGets.clear()
}

function createAbortError() {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

/*
The optional `signal` (from an AbortController) lets callers cancel a
request that is no longer needed - e.g. when a component unmounts, or
when its dependencies change before the previous fetch finished.
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

/*
GET helper with in-flight deduplication.

- Identical concurrent GETs to the same endpoint share one network call.
- A caller's AbortSignal only cancels that caller's wait for the result;
  it does not abort the shared HTTP request (so StrictMode remounts do
  not produce cancelled Network-tab entries).
- Mutations and non-GET methods should keep using apiRequest.
*/
export function apiGet(endpoint, { signal } = {}) {
  let shared = inflightGets.get(endpoint)

  if (!shared) {
    shared = apiRequest(endpoint)
      .finally(() => {
        if (inflightGets.get(endpoint) === shared) {
          inflightGets.delete(endpoint)
        }
      })
    inflightGets.set(endpoint, shared)
  }

  if (!signal) {
    return shared
  }

  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError())
      return
    }

    const onAbort = () => {
      reject(createAbortError())
    }

    signal.addEventListener('abort', onAbort)

    shared.then(
      (data) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) {
          reject(createAbortError())
          return
        }
        resolve(data)
      },
      (err) => {
        signal.removeEventListener('abort', onAbort)
        if (signal.aborted) {
          reject(createAbortError())
          return
        }
        reject(err)
      }
    )
  })
}
