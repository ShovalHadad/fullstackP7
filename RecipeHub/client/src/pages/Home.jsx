import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import Spinner from '../components/Spinner'
import './Home.css'

function Home() {
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesError, setCategoriesError] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [page, setPage] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const categoriesAbortRef = useRef(null)
  const recipesAbortRef = useRef(null)

  useEffect(() => {
    const cachedCategories = getCache('/categories')
    if (cachedCategories) {
      setCategories(cachedCategories.categories)
      return
    }

    const controller = new AbortController()
    categoriesAbortRef.current = controller

    apiRequest('/categories', { signal: controller.signal })
      .then((data) => {
        setCache('/categories', data)
        setCategories(data.categories)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setCategoriesError('Could not load categories.')
      })

    return () => controller.abort()
  }, [])

  /*
  Re-runs whenever a filter or the page changes. The AbortController
  cancels whichever request is still in flight - both the StrictMode
  duplicate on first mount, and a still-pending request for the
  previous filters if the user changes them again quickly - so a slow
  , stale response can never overwrite a newer one.
  */
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('page', page)
    if (appliedSearch) params.set('search', appliedSearch)
    if (categoryId) params.set('categoryId', categoryId)
    if (difficulty) params.set('difficulty', difficulty)

    const cacheKey = `/recipes?${params.toString()}`
    const cachedRecipes = getCache(cacheKey)

    if (cachedRecipes) {
      setRecipes(cachedRecipes.items)
      setPagination(cachedRecipes.pagination)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    recipesAbortRef.current = controller

    setIsLoading(true)
    setError('')

    apiRequest(cacheKey, { signal: controller.signal })
      .then((data) => {
        setCache(cacheKey, data)
        setRecipes(data.items)
        setPagination(data.pagination)
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
  }, [appliedSearch, categoryId, difficulty, page])

  function handleSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
    setAppliedSearch(searchInput)
  }

  function handleCategoryChange(e) {
    setPage(1)
    setCategoryId(e.target.value)
  }

  function handleDifficultyChange(e) {
    setPage(1)
    setDifficulty(e.target.value)
  }

  return (
    <div className="home-page">
      <form className="home-filters" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />

        <select value={categoryId} onChange={handleCategoryChange}>
          <option value="">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <select value={difficulty} onChange={handleDifficultyChange}>
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button type="submit">Search</button>
      </form>

      {error && <p className="home-error">{error}</p>}
      {categoriesError && <p className="home-error">{categoriesError}</p>}

      {isLoading && <Spinner label="Loading recipes..." />}

      {!isLoading && recipes.length === 0 && <p>No recipes found.</p>}

      {!isLoading && recipes.length > 0 && (
        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <Link to={`/recipes/${recipe.id}`} key={recipe.id} className="recipe-card">
              <img src={recipe.image_url} alt={recipe.title} />

              <div className="recipe-card-body">
                <h3>{recipe.title}</h3>
                <p className="recipe-card-category">{recipe.category_name}</p>
                <p className="recipe-card-meta">
                  {recipe.total_time} min &middot; {recipe.difficulty}
                </p>
                <p className="recipe-card-rating">
                  &#9733; {Number(recipe.average_rating).toFixed(1)} ({recipe.review_count})
                </p>
                <p className="recipe-card-chef">by {recipe.chef_name}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {pagination.total_pages > 1 && (
        <div className="home-pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>

          <span>
            Page {pagination.page} of {pagination.total_pages}
          </span>

          <button
            type="button"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default Home
