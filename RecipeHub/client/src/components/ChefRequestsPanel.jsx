import { useState, useEffect, useContext, useRef } from 'react'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from './Spinner'
import './ChefRequestsPanel.css'

function ChefRequestsPanel() {
  const { showToast } = useContext(ToastContext)

  const [statusFilter, setStatusFilter] = useState('pending')
  const [requests, setRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [actingId, setActingId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const abortControllerRef = useRef(null)

  useEffect(() => {
    const cacheKey = `/admin/chef-requests?status=${statusFilter}`
    const cached = getCache(cacheKey)

    if (cached) {
      setRequests(cached.requests)
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
        setRequests(data.requests)
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
  }, [statusFilter])

  async function handleApprove(requestId) {
    setActingId(requestId)
    setError('')

    try {
      await apiRequest(`/admin/chef-requests/${requestId}/approve`, { method: 'PATCH' })
      clearCache('/admin/chef-requests')
      clearCache('/admin/users')
      setRequests(
        requests.map((request) =>
          request.id === requestId ? { ...request, status: 'approved' } : request
        )
      )
      showToast('Chef request approved', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  function startReject(requestId) {
    setRejectingId(requestId)
    setRejectionReason('')
  }

  function cancelReject() {
    setRejectingId(null)
    setRejectionReason('')
  }

  async function handleConfirmReject(requestId) {
    if (rejectionReason.trim().length < 3) {
      setError('A rejection reason of at least 3 characters is required')
      return
    }

    setActingId(requestId)
    setError('')

    try {
      await apiRequest(`/admin/chef-requests/${requestId}/reject`, {
        method: 'PATCH',
        body: { rejectionReason },
      })
      clearCache('/admin/chef-requests')
      setRequests(
        requests.map((request) =>
          request.id === requestId
            ? { ...request, status: 'rejected', rejection_reason: rejectionReason }
            : request
        )
      )
      setRejectingId(null)
      setRejectionReason('')
      showToast('Chef request rejected', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setActingId(null)
    }
  }

  return (
    <div className="chef-requests-panel">
      <div className="chef-requests-filters">
        {['pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            type="button"
            className={statusFilter === status ? 'filter-tab active' : 'filter-tab'}
            onClick={() => setStatusFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {error && <p className="chef-requests-error">{error}</p>}
      {isLoading && <Spinner label="Loading requests..." />}
      {!isLoading && requests.length === 0 && <p>No {statusFilter} chef requests.</p>}

      <div className="chef-requests-list">
        {requests.map((request) => (
          <div className="chef-request-item" key={request.id}>
            <div className="chef-request-header">
              <div>
                <p className="chef-request-name">{request.full_name}</p>
                <p className="chef-request-contact">
                  {request.username} &middot; {request.email}
                </p>
              </div>
              <span className={`status-badge status-${request.status}`}>{request.status}</span>
            </div>

            <p className="chef-request-field">
              <span>Display Name:</span> {request.display_name}
            </p>
            <p className="chef-request-field">
              <span>Bio:</span> {request.bio}
            </p>
            <p className="chef-request-field">
              <span>Experience:</span> {request.experience}
            </p>
            <p className="chef-request-field">
              <span>Specialties:</span> {request.specialties}
            </p>

            {request.status === 'rejected' && request.rejection_reason && (
              <p className="chef-request-rejection">Rejected: {request.rejection_reason}</p>
            )}

            {request.status === 'pending' && (
              <div className="chef-request-actions">
                {rejectingId === request.id ? (
                  <div className="reject-form">
                    <textarea
                      placeholder="Reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                    />
                    <div className="reject-form-buttons">
                      <button
                        type="button"
                        disabled={actingId === request.id}
                        onClick={() => handleConfirmReject(request.id)}
                      >
                        Confirm Reject
                      </button>
                      <button type="button" onClick={cancelReject}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="approve-button"
                      disabled={actingId === request.id}
                      onClick={() => handleApprove(request.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="reject-button"
                      disabled={actingId === request.id}
                      onClick={() => startReject(request.id)}
                    >
                      Reject
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ChefRequestsPanel
