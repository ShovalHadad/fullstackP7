import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { apiRequest } from '../services/api'
import Spinner from './Spinner'
import './ReviewSection.css'

function ReviewSection({ recipeId, chefId }) {
  const { user } = useContext(AuthContext)

  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadReviews()
  }, [recipeId])

  function loadReviews() {
    setIsLoading(true)
    setError('')

    apiRequest(`/recipes/${recipeId}/reviews`)
      .then((data) => setReviews(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }

  const isOwnRecipe = user && Number(user.id) === Number(chefId)
  const alreadyReviewed = user && reviews.some((review) => Number(review.user.id) === Number(user.id))

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!comment.trim()) {
      setFormError('Please write a comment for your review')
      return
    }

    const formData = new FormData()
    formData.append('rating', rating)
    formData.append('comment', comment)
    if (imageFile) {
      formData.append('image', imageFile)
    }

    setIsSubmitting(true)

    try {
      await apiRequest(`/recipes/${recipeId}/reviews`, {
        method: 'POST',
        body: formData,
        isFormData: true,
      })

      setRating(5)
      setComment('')
      setImageFile(null)
      loadReviews()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="review-section">
      <h2>Reviews</h2>

      {isLoading && <Spinner label="Loading reviews..." />}
      {error && <p className="review-error">{error}</p>}

      {!isLoading && reviews.length === 0 && <p>No reviews yet.</p>}

      <div className="review-list">
        {reviews.map((review) => (
          <div className="review-item" key={review.id}>
            <div className="review-item-header">
              <span className="review-item-username">{review.user.username}</span>
              <span className="review-item-stars">
                {'\u2605'.repeat(review.rating)}
                {'\u2606'.repeat(5 - review.rating)}
              </span>
            </div>

            <p className="review-item-comment">{review.comment}</p>

            {review.image_url && (
              <img src={review.image_url} alt="Review" className="review-item-image" />
            )}
          </div>
        ))}
      </div>

      {user && !isOwnRecipe && !alreadyReviewed && (
        <form className="review-form" onSubmit={handleSubmit}>
          <h3>Write a Review</h3>

          {formError && <p className="review-error">{formError}</p>}

          <div className="review-form-stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                type="button"
                key={value}
                className={value <= rating ? 'star-button selected' : 'star-button'}
                onClick={() => setRating(value)}
              >
                &#9733;
              </button>
            ))}
          </div>

          <textarea
            placeholder="Share your experience with this recipe..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0] || null)}
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ReviewSection
