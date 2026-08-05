import { useState, useEffect } from 'react'
import { apiRequest } from '../services/api'
import './SaveRecipeButton.css'

function SaveRecipeButton({ recipeId }) {
  const [folders, setFolders] = useState([])
  const [savedRecipe, setSavedRecipe] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError('')

      try {
        const foldersData = await apiRequest('/folders')
        setFolders(foldersData.folders)

        const savedData = await apiRequest('/saved-recipes')
        const existing = savedData.recipes.find(
          (recipe) => Number(recipe.recipe_id) === Number(recipeId)
        )
        setSavedRecipe(existing || null)
      } catch (err) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [recipeId])

  async function handleSave() {
    setIsSaving(true)
    setError('')

    try {
      const data = await apiRequest('/saved-recipes', {
        method: 'POST',
        body: { recipeId, folderId: null },
      })
      setSavedRecipe(data.saved_recipe)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemove() {
    setIsSaving(true)
    setError('')

    try {
      await apiRequest(`/saved-recipes/${savedRecipe.id}`, { method: 'DELETE' })
      setSavedRecipe(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleFolderChange(e) {
    const folderId = e.target.value || null
    setIsSaving(true)
    setError('')

    try {
      const data = await apiRequest(`/saved-recipes/${savedRecipe.id}/move`, {
        method: 'PATCH',
        body: { folderId },
      })
      setSavedRecipe(data.saved_recipe)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return null
  }

  return (
    <div className="save-recipe">
      {error && <p className="save-recipe-error">{error}</p>}

      {!savedRecipe ? (
        <button type="button" className="save-recipe-button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? 'Saving...' : '☆ Save Recipe'}
        </button>
      ) : (
        <div className="save-recipe-saved">
          <button
            type="button"
            className="save-recipe-button saved"
            disabled={isSaving}
            onClick={handleRemove}
          >
            {isSaving ? 'Removing...' : '★ Saved'}
          </button>

          <select
            value={savedRecipe.folder_id || ''}
            onChange={handleFolderChange}
            disabled={isSaving}
          >
            <option value="">Unsorted</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

export default SaveRecipeButton
