import { useNavigate } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { clearCache } from '../services/cache'
import RecipeForm from '../components/RecipeForm'
import './AddRecipe.css'

function AddRecipe() {
  const navigate = useNavigate()

  async function handleSubmit(formData) {
    const data = await apiRequest('/recipes', {
      method: 'POST',
      body: formData,
      isFormData: true,
    })

    clearCache('/recipes')
    navigate(`/recipes/${data.recipe.id}`)
  }

  return (
    <div className="add-recipe-page">
      <h1>Add Recipe</h1>
      <RecipeForm onSubmit={handleSubmit} submitLabel="Create Recipe" />
    </div>
  )
}

export default AddRecipe
