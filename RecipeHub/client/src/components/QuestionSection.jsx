import { useState, useEffect, useContext, useRef } from 'react'
import { AuthContext } from '../context/AuthContext'
import { ToastContext } from '../context/ToastContext'
import { apiRequest } from '../services/api'
import { getCache, setCache } from '../services/cache'
import Spinner from './Spinner'
import './QuestionSection.css'

function QuestionSection({ recipeId, chefId }) {
  const { user } = useContext(AuthContext)
  const { showToast } = useContext(ToastContext)
  const isRecipeChef = user && Number(user.id) === Number(chefId)

  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [questionText, setQuestionText] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [answerDrafts, setAnswerDrafts] = useState({})
  const [answeringId, setAnsweringId] = useState(null)

  const abortControllerRef = useRef(null)

  /*
  The Chef Dashboard fetches this same endpoint (per recipe) to build
  its "waiting questions" list, using the identical cache key, so
  whichever screen the chef visits first performs the real request.
  */
  useEffect(() => {
    const questionsKey = `/recipes/${recipeId}/questions`
    const cached = getCache(questionsKey)

    if (cached) {
      setQuestions(cached.questions)
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)
    setError('')

    apiRequest(questionsKey, { signal: controller.signal })
      .then((data) => {
        setCache(questionsKey, data)
        setQuestions(data.questions)
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
  }, [recipeId])

  /*
  Re-fetches after a mutation (asking or answering a question) and
  refreshes the shared cache entry, so the Chef Dashboard's own copy
  of this recipe's questions is not left stale.
  */
  async function reloadQuestions() {
    const questionsKey = `/recipes/${recipeId}/questions`
    const data = await apiRequest(questionsKey)
    setCache(questionsKey, data)
    setQuestions(data.questions)
  }

  async function handleAskSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!questionText.trim()) {
      setFormError('Please write a question')
      return
    }

    setIsSubmitting(true)

    try {
      await apiRequest(`/recipes/${recipeId}/questions`, {
        method: 'POST',
        body: { questionText },
      })

      setQuestionText('')
      await reloadQuestions()
      showToast('Question submitted', 'success')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAnswerDraftChange(questionId, value) {
    setAnswerDrafts({ ...answerDrafts, [questionId]: value })
  }

  async function handleAnswerSubmit(questionId) {
    const answerText = answerDrafts[questionId] || ''

    if (!answerText.trim()) {
      return
    }

    setAnsweringId(questionId)

    try {
      await apiRequest(`/questions/${questionId}/answer`, {
        method: 'POST',
        body: { answerText },
      })

      setAnswerDrafts({ ...answerDrafts, [questionId]: '' })
      await reloadQuestions()
      showToast('Answer posted', 'success')
    } catch (err) {
      setError(err.message)
    } finally {
      setAnsweringId(null)
    }
  }

  return (
    <div className="question-section">
      <h2>Questions & Answers</h2>

      {isLoading && <Spinner label="Loading questions..." />}
      {error && <p className="question-error">{error}</p>}

      {!isLoading && questions.length === 0 && <p>No questions yet.</p>}

      <div className="question-list">
        {questions.map((question) => (
          <div className="question-item" key={question.id}>
            <p className="question-item-text">
              <span className="question-item-username">{question.user.username}:</span>{' '}
              {question.question_text}
            </p>

            {question.answer ? (
              <div className="answer-item">
                <span className="answer-badge">Chef's Answer</span>
                <p className="answer-item-text">{question.answer.answer_text}</p>
              </div>
            ) : (
              isRecipeChef && (
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
              )
            )}
          </div>
        ))}
      </div>

      {user && (
        <form className="question-form" onSubmit={handleAskSubmit}>
          <h3>Ask a Question</h3>

          {formError && <p className="question-error">{formError}</p>}

          <textarea
            placeholder="Ask the chef something about this recipe..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Question'}
          </button>
        </form>
      )}
    </div>
  )
}

export default QuestionSection
