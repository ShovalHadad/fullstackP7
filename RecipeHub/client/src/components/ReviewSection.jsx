import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../context/AuthContext'
import { ToastContext } from '../context/ToastContext'
import { apiGet, apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import Spinner from './Spinner'
import './ReviewSection.css'

function ReviewSection({ recipeId, chefId, initialReviews, onReviewsChanged }) {
  const { user } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)

  const [reviews, setReviews] = useState(initialReviews ?? [])
  const [isLoading, setIsLoading] = useState(initialReviews === undefined)
  const [error, setError] = useState('')

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  /*
  When RecipeDetails already loaded reviews, skip the GET entirely.
  Standalone use (or cache miss in parent) still fetches with AbortController.
  */
  useEffect(() => {
    if (initialReviews !== undefined) {
      setReviews(initialReviews)
      setIsLoading(false)
      return
    }

    const reviewsKey = `/recipes/${recipeId}/reviews`
    const cached = getCache(reviewsKey)

    if (cached) {
      setReviews(cached.items)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()

    setIsLoading(true)
    setError('')

    apiGet(reviewsKey, { signal: controller.signal })
      .then((data) => {
        setCache(reviewsKey, data)
        setReviews(data.items)
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
  }, [recipeId, initialReviews])

  const isOwnRecipe = user && Number(user.id) === Number(chefId)
  const alreadyReviewed =
    user && reviews.some((review) => Number(review.user.id) === Number(user.id))

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

      const reviewsKey = `/recipes/${recipeId}/reviews`
      const freshData = await apiGet(reviewsKey)
      setCache(reviewsKey, freshData)
      setReviews(freshData.items)
      clearCache('/recipes?')

      if (onReviewsChanged) {
        onReviewsChanged(freshData.summary, freshData.items)
      }

      showToast('Review submitted', 'success')
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
