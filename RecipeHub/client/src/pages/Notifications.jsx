import { useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiRequest } from '../services/api'
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

  /*
  Notifications are deliberately never read from or written to the
  shared cache. A notification is created by someone else's action,
  so this tab has no mutation of its own to invalidate a cache entry.
  apiGet still dedupes StrictMode remounts onto one HTTP request.
  */
  useEffect(() => {
    const controller = new AbortController()

    setIsLoading(true)
    setError('')

    apiGet(`/notifications?page=${page}`, { signal: controller.signal })
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
