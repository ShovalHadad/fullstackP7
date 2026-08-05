import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import Spinner from './Spinner'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, isLoading } = useContext(AuthContext)

  if (isLoading) {
    return <Spinner label="Loading..." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
