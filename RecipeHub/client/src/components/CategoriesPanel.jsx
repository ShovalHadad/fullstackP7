import { useState, useEffect, useContext, useRef } from 'react'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from './Spinner'
import './CategoriesPanel.css'

function CategoriesPanel() {
  const { showToast } = useContext(ToastContext)

  const [categories, setCategories] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [editingDescription, setEditingDescription] = useState('')

  const abortControllerRef = useRef(null)

  useEffect(() => {
    const cached = getCache('/admin/categories')
    if (cached) {
      setCategories(cached.categories)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError('')

    apiRequest('/admin/categories', { signal: controller.signal })
      .then((data) => {
        setCache('/admin/categories', data)
        setCategories(data.categories)
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
  }, [])

  function loadCategories() {
    setIsLoading(true)
    setError('')

    apiRequest('/admin/categories')
      .then((data) => {
        setCache('/admin/categories', data)
        setCategories(data.categories)
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }

  function invalidateCategories() {
    clearCache('/admin/categories')
    clearCache('/categories')
  }

  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!newName.trim() || !newDescription.trim()) {
      setError('Name and description are required')
      return
    }

    try {
      await apiRequest('/admin/categories', {
        method: 'POST',
        body: { name: newName.trim(), description: newDescription.trim() },
      })
      setNewName('')
      setNewDescription('')
      invalidateCategories()
      loadCategories()
      showToast('Category created', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  function startEditing(category) {
    setEditingId(category.id)
    setEditingName(category.name)
    setEditingDescription(category.description || '')
  }

  function cancelEditing() {
    setEditingId(null)
  }

  async function handleSaveEdit(categoryId) {
    setError('')

    if (!editingName.trim() || !editingDescription.trim()) {
      setError('Name and description are required')
      return
    }

    try {
      await apiRequest(`/admin/categories/${categoryId}`, {
        method: 'PUT',
        body: { name: editingName.trim(), description: editingDescription.trim() },
      })
      setEditingId(null)
      invalidateCategories()
      loadCategories()
      showToast('Category updated', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleToggleActive(category) {
    setError('')
    const action = category.is_active ? 'deactivate' : 'activate'

    try {
      await apiRequest(`/admin/categories/${category.id}/${action}`, { method: 'PATCH' })
      invalidateCategories()
      setCategories(
        categories.map((c) => (c.id === category.id ? { ...c, is_active: !c.is_active } : c))
      )
      showToast(action === 'activate' ? 'Category activated' : 'Category deactivated', 'success')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="categories-panel">
      <form className="category-create-form" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New category name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Description..."
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <button type="submit">Add Category</button>
      </form>

      {error && <p className="categories-error">{error}</p>}
      {isLoading && <Spinner label="Loading categories..." />}

      <div className="category-list">
        {categories.map((category) => (
          <div className="category-item" key={category.id}>
            {editingId === category.id ? (
              <div className="category-edit-form">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                />
                <input
                  type="text"
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                />
                <div className="category-edit-buttons">
                  <button type="button" onClick={() => handleSaveEdit(category.id)}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="category-info">
                  <p className="category-name">{category.name}</p>
                  <p className="category-description">{category.description}</p>
                </div>

                <div className="category-actions">
                  <span className={category.is_active ? 'status-badge active' : 'status-badge inactive'}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button type="button" onClick={() => startEditing(category)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleToggleActive(category)}>
                    {category.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CategoriesPanel
