import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import Spinner from '../components/Spinner'
import './ChefRequest.css'

function ChefRequest() {
  const [existingRequest, setExistingRequest] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [experience, setExperience] = useState('')
  const [specialties, setSpecialties] = useState('')

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    apiRequest('/chef-requests/me')
      .then((data) => setExistingRequest(data.request))
      .catch(() => setExistingRequest(null))
      .finally(() => setIsLoading(false))
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
