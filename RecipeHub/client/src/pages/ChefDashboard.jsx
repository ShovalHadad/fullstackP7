import { useState, useEffect, useContext, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import { apiRequest } from '../services/api'
import { getCache, setCache, clearCache } from '../services/cache'
import { ToastContext } from '../context/ToastContext'
import Spinner from '../components/Spinner'
import './ChefDashboard.css'

function ChefDashboard() {
  const { user } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)

  const [recipes, setRecipes] = useState([])
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true)
  const [recipesError, setRecipesError] = useState('')

  const [waitingQuestions, setWaitingQuestions] = useState([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true)
  const [answerDrafts, setAnswerDrafts] = useState({})
  const [answeringId, setAnsweringId] = useState(null)

  const recipesAbortRef = useRef(null)
  const questionsAbortRef = useRef(null)

  useEffect(() => {
    const cacheKey = `/recipes?chefId=${user.id}&limit=50`
    const cached = getCache(cacheKey)

    if (cached) {
      setRecipes(cached.items)
      setIsLoadingRecipes(false)
      return
    }

    const controller = new AbortController()
    recipesAbortRef.current = controller

    setIsLoadingRecipes(true)
    setRecipesError('')

    apiRequest(cacheKey, { signal: controller.signal })
      .then((data) => {
        setCache(cacheKey, data)
        setRecipes(data.items)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setRecipesError(err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingRecipes(false)
        }
      })

    return () => controller.abort()
  }, [])

  /*
  Each recipe's questions are fetched (or read from cache, if
  QuestionSection on that recipe's page already loaded them first)
  and combined into one "waiting questions" list. The AbortController
  cancels every in-flight request in this batch if the recipe list
  changes again or the component unmounts before they finish.
  */
  useEffect(() => {
    if (recipes.length === 0) {
      setIsLoadingQuestions(false)
      return
    }

    const controller = new AbortController()
    questionsAbortRef.current = controller

    async function loadWaitingQuestions() {
      setIsLoadingQuestions(true)

      try {
        const results = await Promise.all(
          recipes.map(async (recipe) => {
            const questionsKey = `/recipes/${recipe.id}/questions`
            const cached = getCache(questionsKey)
            const data = cached || (await apiRequest(questionsKey, { signal: controller.signal }))

            if (!cached) {
              setCache(questionsKey, data)
            }

            return {
              recipeId: recipe.id,
              recipeTitle: recipe.title,
              questions: data.questions.filter((question) => !question.answer),
            }
          })
        )

        const flattened = results.flatMap((result) =>
          result.questions.map((question) => ({
            ...question,
            recipeId: result.recipeId,
            recipeTitle: result.recipeTitle,
          }))
        )

        setWaitingQuestions(flattened)
      } catch (err) {
        if (err.name === 'AbortError') return
        setRecipesError(err.message)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingQuestions(false)
        }
      }
    }

    loadWaitingQuestions()

    return () => controller.abort()
  }, [recipes])

  async function handleDeleteRecipe(recipeId) {
    const confirmed = window.confirm('Delete this recipe? This cannot be undone.')
    if (!confirmed) return

    try {
      await apiRequest(`/recipes/${recipeId}`, { method: 'DELETE' })
      clearCache('/recipes')
      setRecipes(recipes.filter((recipe) => recipe.id !== recipeId))
      showToast('Recipe deleted', 'success')
    } catch (err) {
      setRecipesError(err.message)
    }
  }

  function handleAnswerDraftChange(questionId, value) {
    setAnswerDrafts({ ...answerDrafts, [questionId]: value })
  }

  async function handleAnswerSubmit(questionId) {
    const answerText = answerDrafts[questionId] || ''
    if (!answerText.trim()) return

    const question = waitingQuestions.find((item) => item.id === questionId)

    setAnsweringId(questionId)

    try {
      await apiRequest(`/questions/${questionId}/answer`, {
        method: 'POST',
        body: { answerText },
      })
      setAnswerDrafts({ ...answerDrafts, [questionId]: '' })

      /*
      Refetches just this one recipe's questions (a genuinely necessary
      request, since the data changed) and refreshes the shared cache
      entry, so QuestionSection shows the new answer immediately if the
      chef navigates to that recipe's page next.
      */
      if (question) {
        const questionsKey = `/recipes/${question.recipeId}/questions`
        const freshData = await apiRequest(questionsKey)
        setCache(questionsKey, freshData)

        const stillWaiting = freshData.questions
          .filter((item) => !item.answer)
          .map((item) => ({
            ...item,
            recipeId: question.recipeId,
            recipeTitle: question.recipeTitle,
          }))

        setWaitingQuestions([
          ...waitingQuestions.filter((item) => item.recipeId !== question.recipeId),
          ...stillWaiting,
        ])
      }

      showToast('Answer posted', 'success')
    } catch (err) {
      setRecipesError(err.message)
    } finally {
      setAnsweringId(null)
    }
  }

  const totalReviews = recipes.reduce((sum, recipe) => sum + Number(recipe.review_count), 0)
  const weightedRatingSum = recipes.reduce(
    (sum, recipe) => sum + Number(recipe.average_rating) * Number(recipe.review_count),
    0
  )
  const overallAverage = totalReviews > 0 ? weightedRatingSum / totalReviews : 0

  return (
    <div className="chef-dashboard">
      <div className="dashboard-header">
        <h1>Chef Dashboard</h1>
        <Link to="/recipes/new" className="create-recipe-button">
          + Add Recipe
        </Link>
      </div>

      {recipesError && <p className="dashboard-error">{recipesError}</p>}

      <div className="dashboard-stats">
        <div className="stat-card">
          <span className="stat-value">{recipes.length}</span>
          <span className="stat-label">Recipes</span>
        </div>

        <div className="stat-card">
          <span className="stat-value">{overallAverage.toFixed(1)}</span>
          <span className="stat-label">Average Rating ({totalReviews} reviews)</span>
        </div>

        <div className="stat-card">
          <span className="stat-value">&mdash;</span>
          <span className="stat-label">Followers (not available yet)</span>
        </div>
      </div>

      <section className="dashboard-section">
        <h2>My Recipes</h2>

        {isLoadingRecipes && <Spinner label="Loading recipes..." />}
        {!isLoadingRecipes && recipes.length === 0 && <p>You haven't created any recipes yet.</p>}

        {!isLoadingRecipes && recipes.length > 0 && (
          <div className="dashboard-recipe-list">
            {recipes.map((recipe) => (
              <div className="dashboard-recipe-item" key={recipe.id}>
                <img src={recipe.image_url} alt={recipe.title} />

                <div className="dashboard-recipe-info">
                  <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
                  <p>
                    &#9733; {Number(recipe.average_rating).toFixed(1)} ({recipe.review_count} reviews)
                  </p>
                </div>

                <div className="dashboard-recipe-actions">
                  <Link to={`/recipes/${recipe.id}/edit`}>Edit</Link>
                  <button type="button" onClick={() => handleDeleteRecipe(recipe.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Waiting Questions</h2>

        {isLoadingQuestions && <Spinner label="Loading questions..." />}
        {!isLoadingQuestions && waitingQuestions.length === 0 && (
          <p>No questions are waiting for an answer.</p>
        )}

        <div className="waiting-question-list">
          {waitingQuestions.map((question) => (
            <div className="waiting-question-item" key={question.id}>
              <p className="waiting-question-recipe">
                On <Link to={`/recipes/${question.recipeId}`}>{question.recipeTitle}</Link>
              </p>
              <p className="waiting-question-text">
                <span>{question.user.username}:</span> {question.question_text}
              </p>

              <div className="answer-form">
                <textarea
                  placeholder="Write an answer..."
                  value={answerDrafts[question.id] || ''}
                  onChange={(e) => handleAnswerDraftChange(question.id, e.target.value)}
                  rows={2}
                />
                <button
                  type="button"
                  disabled={answeringId === question.id}
                  onClick={() => handleAnswerSubmit(question.id)}
                >
                  {answeringId === question.id ? 'Posting...' : 'Post Answer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ChefDashboard
