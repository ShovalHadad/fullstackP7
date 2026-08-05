import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { ToastContext } from '../context/ToastContext'
import { apiRequest } from '../services/api'
import { clearCache } from '../services/cache'
import ReviewSection from '../components/ReviewSection'
import QuestionSection from '../components/QuestionSection'
import SaveRecipeButton from '../components/SaveRecipeButton'
import Spinner from '../components/Spinner'
import './RecipeDetails.css'

function RecipeDetails() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)

  const [recipe, setRecipe] = useState(null)
  const [ratingSummary, setRatingSummary] = useState({ average_rating: 0, review_count: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadRecipe() {
      setIsLoading(true)
      setError('')

      try {
        const recipeData = await apiRequest(`/recipes/${recipeId}`)
        setRecipe(recipeData.recipe)

        const reviewsData = await apiRequest(`/recipes/${recipeId}/reviews`)
        setRatingSummary(reviewsData.summary)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipe()
  }, [recipeId])

  async function handleAdminDelete() {
    const confirmed = window.confirm(
      'Delete this recipe as an administrator? This cannot be undone.'
    )
    if (!confirmed) return

    setIsDeleting(true)
    setError('')

    try {
      await apiRequest(`/admin/recipes/${recipeId}`, { method: 'DELETE' })
      clearCache('/recipes')
      showToast('Recipe deleted', 'success')
      navigate('/')
    } catch (err) {
      setError(err.message)
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="recipe-details-status">
        <Spinner label="Loading recipe..." />
      </div>
    )
  }

  if (error) {
    return <p className="recipe-details-status recipe-details-error">{error}</p>
  }

  if (!recipe) {
    return null
  }

  const chefName = recipe.chef_display_name || recipe.chef_username
  const publishDate = new Date(recipe.created_at).toLocaleDateString()

  return (
    <div className="recipe-details">
      <img src={recipe.image_url} alt={recipe.title} className="recipe-details-image" />

      <div className="recipe-details-header">
        <h1>{recipe.title}</h1>
        <p className="recipe-details-description">{recipe.description}</p>

        <div className="recipe-details-badges">
          <span>{recipe.category_name}</span>
          <span>{recipe.difficulty}</span>
          <span>{recipe.diet_type}</span>
        </div>

        <div className="recipe-details-rating">
          &#9733; {Number(ratingSummary.average_rating).toFixed(1)} ({ratingSummary.review_count} reviews)
        </div>

        <SaveRecipeButton recipeId={recipe.id} />

        {user?.role === 'admin' && (
          <button
            type="button"
            className="recipe-details-admin-delete"
            disabled={isDeleting}
            onClick={handleAdminDelete}
          >
            {isDeleting ? 'Deleting...' : 'Delete Recipe (Admin)'}
          </button>
        )}
      </div>

      <div className="recipe-details-facts">
        <div>
          <span className="fact-label">Prep Time</span>
          <span>{recipe.preparation_time} min</span>
        </div>

        <div>
          <span className="fact-label">Cook Time</span>
          <span>{recipe.cooking_time} min</span>
        </div>

        <div>
          <span className="fact-label">Servings</span>
          <span>{recipe.servings}</span>
        </div>

        {recipe.allergens && (
          <div>
            <span className="fact-label">Allergens</span>
            <span>{recipe.allergens}</span>
          </div>
        )}
      </div>

      <div className="recipe-details-section">
        <h2>Ingredients</h2>
        <ul className="recipe-details-ingredients">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.position}>
              {ingredient.quantity ? `${ingredient.quantity} ` : ''}
              {ingredient.unit ? `${ingredient.unit} ` : ''}
              {ingredient.ingredient_name}
            </li>
          ))}
        </ul>
      </div>

      <div className="recipe-details-section">
        <h2>Steps</h2>
        <ol className="recipe-details-steps">
          {recipe.steps.map((step) => (
            <li key={step.step_number}>{step.instruction}</li>
          ))}
        </ol>
      </div>

      {recipe.chef_tips && (
        <div className="recipe-details-section">
          <h2>Chef's Tips</h2>
          <p>{recipe.chef_tips}</p>
        </div>
      )}

      <div className="recipe-details-chef">
        {recipe.chef_profile_image_url ? (
          <img
            src={recipe.chef_profile_image_url}
            alt={chefName}
            className="recipe-details-chef-avatar"
          />
        ) : (
          <div className="recipe-details-chef-avatar recipe-details-chef-initial">
            {chefName.charAt(0).toUpperCase()}
          </div>
        )}

        <div>
          <p className="recipe-details-chef-name">{chefName}</p>
          <p className="recipe-details-chef-date">Published on {publishDate}</p>
        </div>
      </div>

      <QuestionSection recipeId={recipe.id} chefId={recipe.chef_id} />

      <ReviewSection recipeId={recipe.id} chefId={recipe.chef_id} />
    </div>
  )
}

export default RecipeDetails
