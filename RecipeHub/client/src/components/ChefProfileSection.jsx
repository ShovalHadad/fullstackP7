import { useState, useContext } from 'react'
import { apiRequest } from '../services/api'
import { ToastContext } from '../context/ToastContext'
import './ChefProfileSection.css'

function ChefProfileSection({ chefProfile, onSaved }) {
  const { showToast } = useContext(ToastContext)

  const [displayName, setDisplayName] = useState(chefProfile.display_name || '')
  const [bio, setBio] = useState(chefProfile.bio || '')
  const [experience, setExperience] = useState(chefProfile.experience || '')
  const [specialties, setSpecialties] = useState(chefProfile.specialties || '')

  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsSaving(true)

    try {
      const data = await apiRequest('/profile/chef', {
        method: 'PUT',
        body: { displayName, bio, experience, specialties },
      })

      setSuccessMessage(
        data.chef_profile.changed ? 'Chef profile updated successfully' : 'No changes to save'
      )

      if (data.chef_profile.changed) {
        if (onSaved) {
          onSaved({ display_name: displayName, bio, experience, specialties })
        }
        showToast('Chef profile updated', 'success')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form className="chef-profile-form" onSubmit={handleSubmit}>
      <h2>Chef Profile</h2>

      {error && <p className="chef-profile-error">{error}</p>}
      {successMessage && <p className="chef-profile-success">{successMessage}</p>}

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
      <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} />

      <label htmlFor="experience">Experience</label>
      <textarea
        id="experience"
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
        rows={3}
      />

      <label htmlFor="specialties">Specialties</label>
      <input
        id="specialties"
        type="text"
        placeholder="e.g. Italian cuisine, baking, grilling"
        value={specialties}
        onChange={(e) => setSpecialties(e.target.value)}
      />

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Chef Profile'}
      </button>
    </form>
  )
}

export default ChefProfileSection
