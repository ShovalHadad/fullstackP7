import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../context/AuthContext'
import { ToastContext } from '../context/ToastContext'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import Spinner from './Spinner'
import './ReviewSection.css'

function ReviewSection({ recipeId, chefId, onReviewsChanged }) {
  const { user } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)

  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const abortControllerRef = useRef(null)

  /*
  RecipeDetails fetches this exact same endpoint first (for the
  rating summary) and caches it under the same key, so by the time
  this effect runs the data is almost always already cached and no
  second request is made.
  */
  useEffect(() => {
    const reviewsKey = `/recipes/${recipeId}/reviews`
    const cached = getCache(reviewsKey)

    if (cached) {
      setReviews(cached.items)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError('')

    apiRequest(reviewsKey, { signal: controller.signal })
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
  }, [recipeId])

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

      /*
      The rating/review count just changed, so this refetch is a
      genuinely necessary request (not a redundant one) - it both
      refreshes this section's list and gives us the fresh summary
      to hand back to RecipeDetails, avoiding a separate request for
      the header. The stale recipe-list cache (used by Home and the
      Chef Dashboard) is invalidated too, since it embeds the old
      average_rating/review_count.
      */
      const reviewsKey = `/recipes/${recipeId}/reviews`
      const freshData = await apiRequest(reviewsKey)
      setCache(reviewsKey, freshData)
      setReviews(freshData.items)
      clearCache('/recipes?')

      if (onReviewsChanged) {
        onReviewsChanged(freshData.summary)
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
