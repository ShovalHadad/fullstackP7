import { useState, useEffect, useRef, useContext } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import './Folders.css'

const FOLDERS_KEY = '/folders'
const SAVED_RECIPES_KEY = '/saved-recipes'

function Folders() {
  const { showToast } = useContext(ToastContext)

  const [folders, setFolders] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [selectedFolderId, setSelectedFolderId] = useState('all')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editingFolderName, setEditingFolderName] = useState('')

  const abortControllerRef = useRef(null)

  /*
  Both cache keys here are shared with SaveRecipeButton, which reads
  and writes the exact same "/folders" and "/saved-recipes" entries.
  Whichever component mounts first performs the real fetch; the other
  reuses the cached result.
  */
  useEffect(() => {
    const cachedFolders = getCache(FOLDERS_KEY)
    const cachedSaved = getCache(SAVED_RECIPES_KEY)

    if (cachedFolders && cachedSaved) {
      setFolders(cachedFolders.folders)
      setSavedRecipes(cachedSaved.recipes)
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
        setSavedRecipes(savedData.recipes)
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
  }, [])

  /*
  Re-fetches both lists fresh after a mutation and refreshes the
  shared cache, rather than relying on the initial-load cache-check
  path (which would otherwise just serve the now-stale entries back).
  */
  async function reloadData() {
    const foldersData = await apiRequest(FOLDERS_KEY)
    setCache(FOLDERS_KEY, foldersData)
    setFolders(foldersData.folders)

    const savedData = await apiRequest(SAVED_RECIPES_KEY)
    setCache(SAVED_RECIPES_KEY, savedData)
    setSavedRecipes(savedData.recipes)
  }

  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!newFolderName.trim()) return

    try {
      await apiRequest('/folders', {
        method: 'POST',
        body: { name: newFolderName.trim() },
      })
      setNewFolderName('')
      await reloadData()
      showToast('Folder created', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  function startEditingFolder(folder) {
    setEditingFolderId(folder.id)
    setEditingFolderName(folder.name)
  }

  async function handleRenameFolder(folderId) {
    if (!editingFolderName.trim()) return

    try {
      await apiRequest(`/folders/${folderId}`, {
        method: 'PUT',
        body: { name: editingFolderName.trim() },
      })
      setEditingFolderId(null)
      await reloadData()
      showToast('Folder renamed', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteFolder(folderId) {
    const confirmed = window.confirm(
      'Delete this folder? Recipes inside it will move to Unsorted.'
    )
    if (!confirmed) return

    try {
      await apiRequest(`/folders/${folderId}`, { method: 'DELETE' })
      if (String(selectedFolderId) === String(folderId)) {
        setSelectedFolderId('all')
      }
      /*
      Deleting a folder also moves its recipes to Unsorted on the
      backend, which changes their folder_id - so the saved-recipes
      cache needs a fresh fetch too, not just the folders list.
      */
      await reloadData()
      showToast('Folder deleted', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemoveSavedRecipe(savedRecipeId) {
    try {
      await apiRequest(`/saved-recipes/${savedRecipeId}`, { method: 'DELETE' })
      const updated = savedRecipes.filter((recipe) => recipe.id !== savedRecipeId)
      setSavedRecipes(updated)
      /*
      Updating the cache directly (instead of just clearing it) means
      the next visit to this page, or to SaveRecipeButton on another
      recipe, reuses this result instead of triggering another fetch.
      */
      setCache(SAVED_RECIPES_KEY, { recipes: updated })
      showToast('Recipe removed from saved', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  const displayedRecipes = savedRecipes.filter((recipe) => {
    if (selectedFolderId === 'all') return true
    if (selectedFolderId === 'unsorted') return recipe.folder_id === null
    return Number(recipe.folder_id) === Number(selectedFolderId)
  })

  return (
    <div className="folders-page">
      <h1>My Folders</h1>

      {error && <p className="folders-error">{error}</p>}

      <form className="folder-create-form" onSubmit={handleCreateFolder}>
        <input
          type="text"
          placeholder="New folder name..."
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
        <button type="submit">Create Folder</button>
      </form>

      <div className="folder-tabs">
        <button
          type="button"
          className={selectedFolderId === 'all' ? 'folder-tab active' : 'folder-tab'}
          onClick={() => setSelectedFolderId('all')}
        >
          All Saved
        </button>

        <button
          type="button"
          className={selectedFolderId === 'unsorted' ? 'folder-tab active' : 'folder-tab'}
          onClick={() => setSelectedFolderId('unsorted')}
        >
          Unsorted
        </button>

        {folders.map((folder) =>
          editingFolderId === folder.id ? (
            <div className="folder-tab-editing" key={folder.id}>
              <input
                type="text"
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
              />
              <button type="button" onClick={() => handleRenameFolder(folder.id)}>
                Save
              </button>
              <button type="button" onClick={() => setEditingFolderId(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="folder-tab-wrapper" key={folder.id}>
              <button
                type="button"
                className={
                  String(selectedFolderId) === String(folder.id) ? 'folder-tab active' : 'folder-tab'
                }
                onClick={() => setSelectedFolderId(folder.id)}
              >
                {folder.name}
              </button>
              <button
                type="button"
                className="folder-icon-button"
                onClick={() => startEditingFolder(folder)}
              >
                &#9998;
              </button>
              <button
                type="button"
                className="folder-icon-button"
                onClick={() => handleDeleteFolder(folder.id)}
              >
                &#128465;
              </button>
            </div>
          )
        )}
      </div>

      {isLoading && <Spinner label="Loading saved recipes..." />}

      {!isLoading && displayedRecipes.length === 0 && <p>No saved recipes here yet.</p>}

      {!isLoading && displayedRecipes.length > 0 && (
        <div className="saved-recipe-grid">
          {displayedRecipes.map((recipe) => (
            <div className="saved-recipe-card" key={recipe.id}>
              <Link to={`/recipes/${recipe.recipe_id}`}>
                <img src={recipe.image_url} alt={recipe.title} />
                <div className="saved-recipe-card-body">
                  <h3>{recipe.title}</h3>
                  <p>
                    {recipe.total_time} min &middot; {recipe.difficulty}
                  </p>
                  <p>by {recipe.chef_name}</p>
                </div>
              </Link>
              <button
                type="button"
                className="saved-recipe-remove"
                onClick={() => handleRemoveSavedRecipe(recipe.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Folders
