import { useState, useContext } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const navigate = useNavigate()

  function closeMenu() {
    setIsMenuOpen(false)
  }

  function handleLogout() {
    logout()
    closeMenu()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="navbar-header">
        <NavLink to="/" className="navbar-brand" onClick={closeMenu}>
          RecipeHub
        </NavLink>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          &#9776;
        </button>
      </div>

      <div className={isMenuOpen ? 'navbar-links open' : 'navbar-links'}>
        {!user && (
          <>
            <NavLink to="/login" onClick={closeMenu}>
              Login
            </NavLink>
            <NavLink to="/register" onClick={closeMenu}>
              Register
            </NavLink>
          </>
        )}

        {user && (
          <>
            <NavLink to="/" onClick={closeMenu}>
              Browse Recipes
            </NavLink>
            <NavLink to="/folders" onClick={closeMenu}>
              My Folders
            </NavLink>

            {user.role === 'user' && (
              <NavLink to="/chef-request" onClick={closeMenu}>
                Become a Chef
              </NavLink>
            )}

            {user.role === 'chef' && (
              <>
                <NavLink to="/recipes/new" onClick={closeMenu}>
                  Add Recipe
                </NavLink>
                <NavLink to="/chef/dashboard" onClick={closeMenu}>
                  Chef Dashboard
                </NavLink>
              </>
            )}

            {user.role === 'admin' && (
              <NavLink to="/admin" onClick={closeMenu}>
                Admin Dashboard
              </NavLink>
            )}

            <NavLink to="/notifications" onClick={closeMenu}>
              Notifications
            </NavLink>

            <NavLink to="/profile" onClick={closeMenu}>
              Profile
            </NavLink>

            <button type="button" className="navbar-logout" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  )
}

export default Navbar
