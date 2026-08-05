import { useState, useEffect, useRef, useContext } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { ToastContext } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import './Notifications.css'

function Notifications() {
  const { showToast } = useContext(ToastContext)

  const [notifications, setNotifications] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })
  const [page, setPage] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const abortControllerRef = useRef(null)

  /*
  Notifications are deliberately never read from or written to the
  shared cache. Every other cached page is invalidated by the same
  user's own mutations (e.g. a chef editing their own recipe clears
  their own cached list) - but a notification is created by someone
  else's action (a different chef answering, another user reviewing,
  an admin approving, etc.), so the recipient's browser tab has no
  mutation of its own to hook a cache invalidation onto. Caching this
  endpoint made it possible to open this page once, have it cached as
  empty, and never see new notifications again without a hard reload.
  The AbortController below still protects against duplicate requests
  from React StrictMode's dev-only double-mount and from rapid page
  changes - it just always talks to the server for the actual data.
  */
  useEffect(() => {
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError('')

    apiRequest(`/notifications?page=${page}`, { signal: controller.signal })
      .then((data) => {
        setNotifications(data.items)
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
  }, [page])

  async function handleMarkAsRead(notificationId) {
    try {
      await apiRequest(`/notifications/${notificationId}/read`, { method: 'PATCH' })

      setNotifications(
        notifications.map((notification) =>
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        )
      )
      showToast('Marked as read', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' })

      setNotifications(notifications.map((notification) => ({ ...notification, is_read: true })))
      showToast('All notifications marked as read', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  const hasUnread = notifications.some((notification) => !notification.is_read)

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <h1>Notifications</h1>

        {hasUnread && (
          <button type="button" className="mark-all-button" onClick={handleMarkAllAsRead}>
            Mark all as read
          </button>
        )}
      </div>

      {error && <p className="notifications-error">{error}</p>}

      {isLoading && <Spinner label="Loading notifications..." />}

      {!isLoading && notifications.length === 0 && <p>No notifications yet.</p>}

      <div className="notification-list">
        {notifications.map((notification) => (
          <div
            className={
              notification.is_read ? 'notification-item' : 'notification-item unread'
            }
            key={notification.id}
          >
            <div className="notification-item-body">
              <p className="notification-item-title">{notification.title}</p>
              <p className="notification-item-message">{notification.message}</p>
              <p className="notification-item-date">
                {new Date(notification.created_at).toLocaleString()}
              </p>
            </div>

            <div className="notification-item-actions">
              {notification.related_entity?.type === 'recipe' && (
                <Link to={`/recipes/${notification.related_entity.id}`}>View Recipe</Link>
              )}

              {!notification.is_read && (
                <button type="button" onClick={() => handleMarkAsRead(notification.id)}>
                  Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {pagination.total_pages > 1 && (
        <div className="notifications-pagination">
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

export default Notifications
