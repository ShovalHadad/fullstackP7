import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { clearCache } from '../services/cache'
import RecipeForm from '../components/RecipeForm'
import Spinner from '../components/Spinner'
import './AddRecipe.css'

function EditRecipe() {
  const { recipeId } = useParams()
  const navigate = useNavigate()

  const [recipe, setRecipe] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest(`/recipes/${recipeId}`)
      .then((data) => setRecipe(data.recipe))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [recipeId])

  async function handleSubmit(formData) {
    await apiRequest(`/recipes/${recipeId}`, {
      method: 'PUT',
      body: formData,
      isFormData: true,
    })

    clearCache('/recipes')
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
