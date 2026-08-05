import { useState, useEffect, useRef, useContext } from 'react'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from './Spinner'
import './SaveRecipeButton.css'

const FOLDERS_KEY = '/folders'
const SAVED_RECIPES_KEY = '/saved-recipes'

/*
Applies `updater` to the currently cached saved-recipes list and
writes the result back, keeping the shared cache entry (also read by
the Folders page) in sync without a full refetch after every save,
remove, or move action.
*/
function updateSavedRecipesCache(updater) {
  const cached = getCache(SAVED_RECIPES_KEY)
  const currentRecipes = cached ? cached.recipes : []
  setCache(SAVED_RECIPES_KEY, { recipes: updater(currentRecipes) })
}

function SaveRecipeButton({ recipeId }) {
  const { showToast } = useContext(ToastContext)

  const [folders, setFolders] = useState([])
  const [savedRecipe, setSavedRecipe] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const abortControllerRef = useRef(null)

  /*
  Shares its two cache keys with the Folders page - whichever of the
  two mounts first performs the real network requests.
  */
  useEffect(() => {
    const cachedFolders = getCache(FOLDERS_KEY)
    const cachedSaved = getCache(SAVED_RECIPES_KEY)

    if (cachedFolders && cachedSaved) {
      setFolders(cachedFolders.folders)
      const existing = cachedSaved.recipes.find(
        (recipe) => Number(recipe.recipe_id) === Number(recipeId)
      )
      setSavedRecipe(existing || null)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError('')

    async function loadData() {
      try {
        const foldersData =
          cachedFolders || (await apiRequest(FOLDERS_KEY, { signal: controller.signal }))
        setCache(FOLDERS_KEY, foldersData)
        setFolders(foldersData.folders)

        const savedData =
          cachedSaved || (await apiRequest(SAVED_RECIPES_KEY, { signal: controller.signal }))
        setCache(SAVED_RECIPES_KEY, savedData)

        const existing = savedData.recipes.find(
          (recipe) => Number(recipe.recipe_id) === Number(recipeId)
        )
        setSavedRecipe(existing || null)
      } catch (err) {
        if (err.name === 'AbortError') return
        setError(err.message)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => controller.abort()
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

      /*
      The create endpoint only returns { id, recipe_id, folder_id },
      not the joined title/image/chef fields the list view needs, so
      there isn't enough data here to safely append a full entry to
      the cached list. Clearing it (rather than guessing) means the
      Folders page just does one real fetch next time it's opened.
      */
      clearCache(SAVED_RECIPES_KEY)
      showToast('Recipe saved', 'success')
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
      const removedId = savedRecipe.id
      setSavedRecipe(null)
      updateSavedRecipesCache((recipes) => recipes.filter((recipe) => recipe.id !== removedId))
      showToast('Recipe removed from saved', 'success')
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

      /*
      Unlike create, the move response's folder_id can be safely
      merged in: it only overwrites that one field on the existing
      cached entry, so the title/image/chef fields already cached
      are preserved instead of being wiped out.
      */
      updateSavedRecipesCache((recipes) =>
        recipes.map((recipe) =>
          recipe.id === data.saved_recipe.id
            ? { ...recipe, folder_id: data.saved_recipe.folder_id }
            : recipe
        )
      )
      showToast(folderId ? 'Recipe moved to folder' : 'Recipe moved to Unsorted', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Spinner size="small" />
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
