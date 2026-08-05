import { useState, useEffect, useRef, useContext } from 'react'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import './ChefRequest.css'

const CHEF_REQUEST_KEY = '/chef-requests/me'

function ChefRequest() {
  const { showToast } = useContext(ToastContext)

  const [existingRequest, setExistingRequest] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState('')
  const [specialties, setSpecialties] = useState('')

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const abortControllerRef = useRef(null)

  useEffect(() => {
    const cached = getCache(CHEF_REQUEST_KEY)

    if (cached) {
      setExistingRequest(cached.request)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    apiRequest(CHEF_REQUEST_KEY, { signal: controller.signal })
      .then((data) => {
        setCache(CHEF_REQUEST_KEY, data)
        setExistingRequest(data.request)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return

        /*
        The backend returns 404 specifically when the user has never
        submitted a chef request - that is a normal, expected state,
        not an error. Any other status (network failure, 401, 500...)
        is a real problem and should be shown as one, instead of
        silently being treated the same as "no request yet".
        */
        if (err.status === 404) {
          setExistingRequest(null)
        } else {
          setLoadError(err.message || 'Could not load your chef request status. Please try again.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const data = await apiRequest('/chef-requests', {
        method: 'POST',
        body: { displayName, bio, experience, specialties },
      })
      setExistingRequest(data.request)
      setCache(CHEF_REQUEST_KEY, data)
      showToast('Chef request submitted', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="chef-request-status">
        <Spinner label="Loading..." />
      </div>
    )
  }

  if (loadError) {
    return <p className="chef-request-status chef-request-error">{loadError}</p>
  }

  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className="chef-request-page">
        <div className="chef-request-notice pending">
          <h1>Chef Request Pending</h1>
          <p>Your request to become a chef is awaiting review by an administrator.</p>
        </div>
      </div>
    )
  }

  if (existingRequest && existingRequest.status === 'approved') {
    return (
      <div className="chef-request-page">
        <div className="chef-request-notice approved">
          <h1>Chef Request Approved</h1>
          <p>Your request was approved. Log out and back in to access your Chef Dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chef-request-page">
      <h1>Become a Chef</h1>

      {existingRequest && existingRequest.status === 'rejected' && (
        <div className="chef-request-notice rejected">
          <p>Your previous request was rejected: {existingRequest.rejection_reason}</p>
          <p>You can submit a new request below.</p>
        </div>
      )}

      <form className="chef-request-form" onSubmit={handleSubmit}>
        {error && <p className="chef-request-error">{error}</p>}

        <label htmlFor="displayName">Display Name</label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          minLength={2}
          required
        />

        <label htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          minLength={10}
          required
        />

        <label htmlFor="experience">Experience</label>
        <textarea
          id="experience"
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          rows={3}
          minLength={5}
          required
        />

        <label htmlFor="specialties">Specialties</label>
        <input
          id="specialties"
          type="text"
          placeholder="e.g. Italian cuisine, baking, grilling"
          value={specialties}
          onChange={(e) => setSpecialties(e.target.value)}
          minLength={2}
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  )
}

export default ChefRequest
