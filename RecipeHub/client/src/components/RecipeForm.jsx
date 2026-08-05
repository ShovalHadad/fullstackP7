import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import './RecipeForm.css'

const emptyIngredient = { name: '', quantity: '', unit: '' }

function RecipeForm({ initialRecipe, onSubmit, submitLabel }) {
  const [title, setTitle] = useState(initialRecipe?.title || '')
  const [description, setDescription] = useState(initialRecipe?.description || '')
  const [categoryId, setCategoryId] = useState(initialRecipe?.category_id || '')
  const [preparationTime, setPreparationTime] = useState(initialRecipe?.preparation_time || '')
  const [cookingTime, setCookingTime] = useState(initialRecipe?.cooking_time || '')
  const [difficulty, setDifficulty] = useState(initialRecipe?.difficulty || 'easy')
  const [servings, setServings] = useState(initialRecipe?.servings || '')
  const [dietType, setDietType] = useState(initialRecipe?.diet_type || 'vegetarian')
  const [allergens, setAllergens] = useState(initialRecipe?.allergens || '')
  const [chefTips, setChefTips] = useState(initialRecipe?.chef_tips || '')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(initialRecipe?.image_url || null)

  const [ingredients, setIngredients] = useState(
    initialRecipe?.ingredients?.length
      ? initialRecipe.ingredients.map((ingredient) => ({
          name: ingredient.ingredient_name,
          quantity: ingredient.quantity || '',
          unit: ingredient.unit || '',
        }))
      : [{ ...emptyIngredient }]
  )

  const [steps, setSteps] = useState(
    initialRecipe?.steps?.length ? initialRecipe.steps.map((step) => step.instruction) : ['']
  )

  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const cached = getCache('/categories')
    if (cached) {
      setCategories(cached.categories)
      return
    }

    apiRequest('/categories')
      .then((data) => {
        setCache('/categories', data)
        setCategories(data.categories)
      })
      .catch(() => {})
  }, [])

  function handleImageChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handleIngredientChange(index, field, value) {
    setIngredients(
      ingredients.map((ingredient, i) =>
        i === index ? { ...ingredient, [field]: value } : ingredient
      )
    )
  }

  function addIngredientRow() {
    setIngredients([...ingredients, { ...emptyIngredient }])
  }

  function removeIngredientRow(index) {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  function handleStepChange(index, value) {
    setSteps(steps.map((step, i) => (i === index ? value : step)))
  }

  function addStepRow() {
    setSteps([...steps, ''])
  }

  function removeStepRow(index) {
    setSteps(steps.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanIngredients = ingredients
      .filter((ingredient) => ingredient.name.trim())
      .map((ingredient) => ({
        name: ingredient.name.trim(),
        quantity: ingredient.quantity || null,
        unit: ingredient.unit || null,
      }))

    const cleanSteps = steps.map((step) => step.trim()).filter((step) => step)

    if (cleanIngredients.length === 0) {
      setError('Please add at least one ingredient')
      return
    }

    if (cleanSteps.length === 0) {
      setError('Please add at least one preparation step')
      return
    }

    if (!imageFile && !initialRecipe) {
      setError('Please upload a recipe image')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('categoryId', categoryId)
    formData.append('preparationTime', preparationTime)
    formData.append('cookingTime', cookingTime)
    formData.append('difficulty', difficulty)
    formData.append('servings', servings)
    formData.append('dietType', dietType)
    formData.append('allergens', allergens)
    formData.append('chefTips', chefTips)
    formData.append('ingredients', JSON.stringify(cleanIngredients))
    formData.append('steps', JSON.stringify(cleanSteps))

    if (imageFile) {
      formData.append('image', imageFile)
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="recipe-form" onSubmit={handleSubmit}>
      {error && <p className="recipe-form-error">{error}</p>}

      <label htmlFor="title">Title</label>
      <input
        id="title"
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        minLength={2}
        required
      />

      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        minLength={10}
        required
      />

      <label htmlFor="category">Category</label>
      <select
        id="category"
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        required
      >
        <option value="">Select a category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <div className="recipe-form-row">
        <div>
          <label htmlFor="preparationTime">Prep Time (min)</label>
          <input
            id="preparationTime"
            type="number"
            min="1"
            value={preparationTime}
            onChange={(e) => setPreparationTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="cookingTime">Cook Time (min)</label>
          <input
            id="cookingTime"
            type="number"
            min="0"
            value={cookingTime}
            onChange={(e) => setCookingTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="servings">Servings</label>
          <input
            id="servings"
            type="number"
            min="1"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="recipe-form-row">
        <div>
          <label htmlFor="difficulty">Difficulty</label>
          <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label htmlFor="dietType">Diet Type</label>
          <select id="dietType" value={dietType} onChange={(e) => setDietType(e.target.value)}>
            <option value="meat">Meat</option>
            <option value="dairy">Dairy</option>
            <option value="parve">Parve</option>
            <option value="vegan">Vegan</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <label htmlFor="allergens">Allergens (optional)</label>
      <input
        id="allergens"
        type="text"
        value={allergens}
        onChange={(e) => setAllergens(e.target.value)}
      />

      <label htmlFor="chefTips">Chef's Tips (optional)</label>
      <textarea
        id="chefTips"
        value={chefTips}
        onChange={(e) => setChefTips(e.target.value)}
        rows={2}
      />

      <label htmlFor="image">
        Recipe Image {initialRecipe && '(leave empty to keep the current image)'}
      </label>
      <input id="image" type="file" accept="image/*" onChange={handleImageChange} />
      {imagePreview && <img src={imagePreview} alt="Preview" className="recipe-form-image-preview" />}

      <div className="recipe-form-list-section">
        <label>Ingredients</label>

        {ingredients.map((ingredient, index) => (
          <div className="ingredient-row" key={index}>
            <input
              type="text"
              placeholder="Name"
              value={ingredient.name}
              onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
            />
            <input
              type="number"
              placeholder="Qty"
              min="0"
              step="any"
              value={ingredient.quantity}
              onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
            />
            <input
              type="text"
              placeholder="Unit"
              value={ingredient.unit}
              onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
            />
            <button type="button" onClick={() => removeIngredientRow(index)}>
              &#10005;
            </button>
          </div>
        ))}

        <button type="button" className="add-row-button" onClick={addIngredientRow}>
          + Add Ingredient
        </button>
      </div>

      <div className="recipe-form-list-section">
        <label>Steps</label>

        {steps.map((step, index) => (
          <div className="step-row" key={index}>
            <span className="step-number">{index + 1}</span>
            <textarea
              placeholder="Instruction"
              value={step}
              onChange={(e) => handleStepChange(index, e.target.value)}
              rows={2}
            />
            <button type="button" onClick={() => removeStepRow(index)}>
              &#10005;
            </button>
          </div>
        ))}

        <button type="button" className="add-row-button" onClick={addStepRow}>
          + Add Step
        </button>
      </div>

      <button type="submit" className="recipe-form-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}

export default RecipeForm
