import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import Spinner from '../components/Spinner'
import './Folders.css'

function Folders() {
  const [folders, setFolders] = useState([])
  const [savedRecipes, setSavedRecipes] = useState([])
  const [selectedFolderId, setSelectedFolderId] = useState('all')

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState(null)
  const [editingFolderName, setEditingFolderName] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setIsLoading(true)
    setError('')

    try {
      const foldersData = await apiRequest('/folders')
      setFolders(foldersData.folders)

      const savedData = await apiRequest('/saved-recipes')
      setSavedRecipes(savedData.recipes)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
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
      loadData()
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
      loadData()
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
      loadData()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleRemoveSavedRecipe(savedRecipeId) {
    try {
      await apiRequest(`/saved-recipes/${savedRecipeId}`, { method: 'DELETE' })
      setSavedRecipes(savedRecipes.filter((recipe) => recipe.id !== savedRecipeId))
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
