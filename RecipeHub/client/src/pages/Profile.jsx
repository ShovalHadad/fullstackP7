import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../context/AuthContext'
import { ToastContext } from '../context/ToastContext'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import ChefProfileSection from '../components/ChefProfileSection'
import Spinner from '../components/Spinner'
import './Profile.css'

const PROFILE_KEY = '/profile'

function Profile() {
  const { updateUser } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)

  const [profile, setProfile] = useState(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const fileInputRef = useRef(null)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    const cached = getCache(PROFILE_KEY)

    if (cached) {
      setProfile(cached.profile)
      setFullName(cached.profile.full_name)
      setUsername(cached.profile.username)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    apiRequest(PROFILE_KEY, { signal: controller.signal })
      .then((data) => {
        setCache(PROFILE_KEY, data)
        setProfile(data.profile)
        setFullName(data.profile.full_name)
        setUsername(data.profile.username)
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
  }, [])

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setImageFile(file)
    setRemoveImage(false)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleRemoveImage() {
    setImageFile(null)
    setImagePreview(null)
    setRemoveImage(true)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    const formData = new FormData()
    formData.append('fullName', fullName)
    formData.append('username', username)

    if (imageFile) {
      formData.append('image', imageFile)
    } else if (removeImage) {
      formData.append('removeImage', 'true')
    }

    setIsSaving(true)

    try {
      const data = await apiRequest('/profile', {
        method: 'PUT',
        body: formData,
        isFormData: true,
      })

      const updatedProfile = { ...profile, ...data.profile }
      setProfile(updatedProfile)
      setCache(PROFILE_KEY, { profile: updatedProfile })
      updateUser(data.profile)
      setImageFile(null)
      setImagePreview(null)
      setRemoveImage(false)
      setSuccessMessage('Profile updated successfully')
      showToast('Profile updated', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  /*
  ChefProfileSection already knows the values it just saved, so it
  hands them back here instead of this component re-fetching /profile
  just to pick up the same data.
  */
  function handleChefProfileSaved(updatedFields) {
    setProfile((previous) => {
      const updated = {
        ...previous,
        chef_profile: { ...previous.chef_profile, ...updatedFields },
      }
      setCache(PROFILE_KEY, { profile: updated })
      return updated
    })
  }

  if (isLoading) {
    return (
      <div className="profile-status">
        <Spinner label="Loading profile..." />
      </div>
    )
  }

  if (!profile) {
    return <p className="profile-status profile-error">{error}</p>
  }

  const displayedImage = imagePreview || (!removeImage ? profile.profile_image_url : null)

  return (
    <div className="profile-page">
      <h1>My Profile</h1>

      {error && <p className="profile-error">{error}</p>}
      {successMessage && <p className="profile-success">{successMessage}</p>}

      <form className="profile-form" onSubmit={handleSubmit}>
        <div className="profile-image-section">
          {displayedImage ? (
            <img src={displayedImage} alt={fullName} className="profile-image" />
          ) : (
            <div className="profile-image profile-image-initial">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="profile-image-actions">
            <label className="profile-image-upload">
              Change Photo
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageChange}
                hidden
              />
            </label>

            {displayedImage && (
              <button type="button" onClick={handleRemoveImage}>
                Remove Photo
              </button>
            )}
          </div>
        </div>

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={profile.email} disabled />

        <label htmlFor="role">Role</label>
        <input id="role" type="text" value={profile.role} disabled />

        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          minLength={2}
          required
        />

        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          required
        />

        <button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {profile.role === 'chef' && (
        <ChefProfileSection chefProfile={profile.chef_profile} onSaved={handleChefProfileSaved} />
      )}
    </div>
  )
}

export default Profile
