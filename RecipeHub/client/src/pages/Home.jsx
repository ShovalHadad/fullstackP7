import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import Spinner from '../components/Spinner'
import './Home.css'

function Home() {
  const [recipes, setRecipes] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1 })

  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [page, setPage] = useState(1)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const cachedCategories = getCache('/categories')
    if (cachedCategories) {
      setCategories(cachedCategories.categories)
      return
    }

    apiRequest('/categories')
      .then((data) => {
        setCache('/categories', data)
        setCategories(data.categories)
      })
      .catch(() => {})
  }, [])

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

    setIsLoading(true)
    setError('')

    apiRequest(cacheKey)
      .then((data) => {
        setCache(cacheKey, data)
        setRecipes(data.items)
        setPagination(data.pagination)
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
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
