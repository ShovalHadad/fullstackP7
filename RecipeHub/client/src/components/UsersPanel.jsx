import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../context/AuthContext'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from './Spinner'
import './UsersPanel.css'

function UsersPanel() {
  const { user: currentUser } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)

  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const [page, setPage] = useState(1)

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [blockedFilter, setBlockedFilter] = useState('')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actingId, setActingId] = useState(null)

  const abortControllerRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page', page)
    if (appliedSearch) params.set('search', appliedSearch)
    if (roleFilter) params.set('role', roleFilter)
    if (blockedFilter) params.set('isBlocked', blockedFilter)

    const cacheKey = `/admin/users?${params.toString()}`
    const cached = getCache(cacheKey)

    if (cached) {
      setUsers(cached.items)
      setPagination(cached.pagination)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError('')

    apiRequest(cacheKey, { signal: controller.signal })
      .then((data) => {
        setCache(cacheKey, data)
        setUsers(data.items)
        setPagination(data.pagination)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [appliedSearch, roleFilter, blockedFilter, page])

  function handleSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(searchInput)
  }

  function handleRoleChange(e) {
    setPage(1)
    setRoleFilter(e.target.value)
  }

  function handleBlockedChange(e) {
    setPage(1)
    setBlockedFilter(e.target.value)
  }

  async function handleToggleBlock(targetUser) {
    setError('')
    setActingId(targetUser.id)
    const action = targetUser.is_blocked ? 'unblock' : 'block'

    try {
      await apiRequest(`/admin/users/${targetUser.id}/${action}`, { method: 'PATCH' })
      clearCache('/admin/users')
      setUsers(
        users.map((u) => (u.id === targetUser.id ? { ...u, is_blocked: !u.is_blocked } : u))
      )
      showToast(action === 'block' ? 'User blocked' : 'User unblocked', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="users-panel">
      <form className="users-filters" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search by name, username or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <select value={roleFilter} onChange={handleRoleChange}>
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="chef">Chef</option>
          <option value="admin">Admin</option>
        </select>

        <select value={blockedFilter} onChange={handleBlockedChange}>
          <option value="">All Statuses</option>
          <option value="false">Active</option>
          <option value="true">Blocked</option>
        </select>

        <button type="submit">Search</button>
      </form>

      {error && <p className="users-error">{error}</p>}
      {isLoading && <Spinner label="Loading users..." />}
      {!isLoading && users.length === 0 && <p>No users found.</p>}

      <div className="user-list">
        {users.map((targetUser) => {
          const isManageable =
            targetUser.role !== 'admin' && targetUser.id !== currentUser.id

          return (
            <div className="user-item" key={targetUser.id}>
              <div className="user-info">
                <p className="user-name">{targetUser.full_name}</p>
                <p className="user-contact">
                  {targetUser.username} &middot; {targetUser.email}
                </p>
              </div>

              <span className={`role-badge role-${targetUser.role}`}>{targetUser.role}</span>

              <span
                className={targetUser.is_blocked ? 'status-badge blocked' : 'status-badge active'}
              >
                {targetUser.is_blocked ? 'Blocked' : 'Active'}
              </span>

              {isManageable ? (
                <button
                  type="button"
                  className={targetUser.is_blocked ? 'unblock-button' : 'block-button'}
                  disabled={actingId === targetUser.id}
                  onClick={() => handleToggleBlock(targetUser)}
                >
                  {targetUser.is_blocked ? 'Unblock' : 'Block'}
                </button>
              ) : (
                <span className="not-manageable">Not manageable</span>
              )}
            </div>
          )
        })}
      </div>

      {pagination.total_pages > 1 && (
        <div className="users-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.total_pages}
          </span>

          <button
            type="button"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default UsersPanel
