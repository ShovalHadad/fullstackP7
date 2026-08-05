import { Link } from 'react-router-dom'
import './NotFound.css'

function NotFound() {
  return (
    <div className="not-found-page">
      <p className="not-found-code">404</p>
      <h1>Page Not Found</h1>
      <p className="not-found-message">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/" className="not-found-link">
        Back to Home
      </Link>
    </div>
  )
}

export default NotFound
