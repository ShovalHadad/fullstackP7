import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import RecipeDetails from './pages/RecipeDetails'
import Folders from './pages/Folders'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import ChefDashboard from './pages/ChefDashboard'
import AddRecipe from './pages/AddRecipe'
import EditRecipe from './pages/EditRecipe'
import AdminDashboard from './pages/AdminDashboard'
import ChefRequest from './pages/ChefRequest'
import NotFound from './pages/NotFound'
import './App.css'

function App() {
  return (
    <>
      <Navbar />

      <main className="app-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recipes/new"
            element={
              <ProtectedRoute allowedRoles={['chef']}>
                <AddRecipe />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recipes/:recipeId/edit"
            element={
              <ProtectedRoute allowedRoles={['chef']}>
                <EditRecipe />
              </ProtectedRoute>
            }
          />

          <Route
            path="/recipes/:recipeId"
            element={
              <ProtectedRoute>
                <RecipeDetails />
              </ProtectedRoute>
            }
          />

          <Route
            path="/folders"
            element={
              <ProtectedRoute>
                <Folders />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chef/dashboard"
            element={
              <ProtectedRoute allowedRoles={['chef']}>
                <ChefDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/chef-request"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <ChefRequest />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  )
}

export default App
