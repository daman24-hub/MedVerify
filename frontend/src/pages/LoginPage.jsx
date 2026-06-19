import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../services/api'
import { showToast } from '../services/toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const next = {}
    if (!email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      next.email = 'Enter a valid email address.'
    }
    if (password.length < 8) {
      next.password = 'Password must be at least 8 characters.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const response = await loginUser({ email, password })
      const token = response?.data?.token
      if (!token) {
        throw new Error('Authentication failed.')
      }
      localStorage.setItem('dawacheck_token', token)
      showToast('Welcome back! You are now signed in.', 'success')
      navigate('/dashboard')
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Login failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell auth-page">
      <section className="auth-card glass-panel">
        <div className="auth-header">
          <span className="eyebrow">Sign in</span>
          <h1>Welcome back to DawaCheck</h1>
          <p>Securely access your scans, preferences, and settings.</p>
        </div>

        <form className="auth-form" onSubmit={onSubmit} noValidate>
          <label className="field-label">
            <span>Email</span>
            <input
              value={email}
              onChange={(evt) => setEmail(evt.target.value)}
              type="email"
              placeholder="name@domain.com"
              className="field"
              required
            />
            {errors.email ? <span className="field-error">{errors.email}</span> : null}
          </label>

          <label className="field-label">
            <span>Password</span>
            <input
              value={password}
              onChange={(evt) => setPassword(evt.target.value)}
              type="password"
              placeholder="At least 8 characters"
              className="field"
              required
            />
            {errors.password ? <span className="field-error">{errors.password}</span> : null}
          </label>

          <button className="button button-cta" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-footnote">
          Don’t have an account? <Link to="/signup">Create one</Link>
        </p>
      </section>
    </main>
  )
}
