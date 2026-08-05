import { useState } from 'react'
import ChefRequestsPanel from '../components/ChefRequestsPanel'
import CategoriesPanel from '../components/CategoriesPanel'
import UsersPanel from '../components/UsersPanel'
import './AdminDashboard.css'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('chefRequests')

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="admin-tabs">
        <button
          type="button"
          className={activeTab === 'chefRequests' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setActiveTab('chefRequests')}
        >
          Chef Requests
        </button>

        <button
          type="button"
          className={activeTab === 'categories' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setActiveTab('categories')}
        >
          Categories
        </button>

        <button
          type="button"
          className={activeTab === 'users' ? 'admin-tab active' : 'admin-tab'}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
      </div>

      {activeTab === 'chefRequests' && <ChefRequestsPanel />}
      {activeTab === 'categories' && <CategoriesPanel />}
      {activeTab === 'users' && <UsersPanel />}
    </div>
  )
}

export default AdminDashboard
