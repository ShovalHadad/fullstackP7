import { useState, useEffect, useRef, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import RecipeForm from '../components/RecipeForm'
import Spinner from '../components/Spinner'
import './AddRecipe.css'

function EditRecipe() {
  const { recipeId } = useParams()
  const navigate = useNavigate()
  const { showToast } = useContext(ToastContext)

  const [recipe, setRecipe] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const abortControllerRef = useRef(null)

  /*
  Uses the same cache key as RecipeDetails, so navigating here right
  after viewing the recipe (a common flow) reuses that data instead
  of fetching it again.
  */
  useEffect(() => {
    const cacheKey = `/recipes/${recipeId}`
    const cached = getCache(cacheKey)

    if (cached) {
      setRecipe(cached.recipe)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    apiRequest(cacheKey, { signal: controller.signal })
      .then((data) => {
        setCache(cacheKey, data)
        setRecipe(data.recipe)
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

  async function handleSubmit(formData) {
    await apiRequest(`/recipes/${recipeId}`, {
      method: 'PUT',
      body: formData,
      isFormData: true,
    })

    clearCache('/recipes')
    showToast('Recipe updated', 'success')
    navigate(`/recipes/${recipeId}`)
  }

  if (isLoading) {
    return (
      <div className="add-recipe-status">
        <Spinner label="Loading recipe..." />
      </div>
    )
  }

  if (error) {
    return <p className="add-recipe-status add-recipe-error">{error}</p>
  }

  return (
    <div className="add-recipe-page">
      <h1>Edit Recipe</h1>
      <RecipeForm initialRecipe={recipe} onSubmit={handleSubmit} submitLabel="Save Changes" />
    </div>
  )
}

export default EditRecipe
