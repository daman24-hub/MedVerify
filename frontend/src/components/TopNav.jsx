import { Link, useNavigate } from 'react-router-dom'
import { clearToken, isAuthenticated } from '../services/auth'

export default function TopNav() {
  const navigate = useNavigate()
  const authenticated = isAuthenticated()

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <header className="topbar shell-topbar glass-panel">
      <div className="brand-markup">
        <div className="brand-mark">+</div>
        <div>
          <p className="brand-name">DawaCheck</p>
          <p className="brand-caption">Premium medicine safety</p>
        </div>
      </div>

      <nav className="site-navigation">
        <Link to="/">Home</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/settings">Settings</Link>
      </nav>

      <div className="nav-actions">
        {authenticated ? (
          <button type="button" className="button button-small button-ghost" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <Link className="button button-small button-ghost" to="/login">
            Login
          </Link>
        )}
      </div>
    </header>
  )
}
