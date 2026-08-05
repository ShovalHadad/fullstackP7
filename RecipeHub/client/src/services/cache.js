/*
A simple in-memory cache for GET requests.

The Map lives in this module's scope, so it persists for as long as
the browser tab stays open (including when navigating between pages
with React Router), but is cleared automatically on a full page reload.
This intentionally avoids storing anything in localStorage, since
cached recipe/notification data does not need to survive a refresh.
*/
const cacheStore = new Map()

export function getCache(key) {
  return cacheStore.get(key)
}

export function setCache(key, value) {
  cacheStore.set(key, value)
}

/*
Removes cached entries.

Call with no arguments to clear everything, or with a prefix
(e.g. "/recipes") to clear only the entries whose key starts with it.
This is how a create/update/delete action "invalidates" a stale list,
so the next visit to that page fetches fresh data instead of reusing
the outdated cached response.
*/
export function clearCache(keyPrefix) {
  if (!keyPrefix) {
    cacheStore.clear()
    return
  }

  for (const key of cacheStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      cacheStore.delete(key)
    }
  }
}
