import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../services/api'
import { showToast } from '../services/toast'

export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    if (password !== confirmPassword) {
      next.confirmPassword = 'Passwords must match.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const response = await registerUser({ email, password })
      const token = response?.data?.token
      if (!token) {
        throw new Error('Signup failed.')
      }
      localStorage.setItem('dawacheck_token', token)
      showToast('Account created successfully.', 'success')
      navigate('/dashboard')
    } catch (error) {
      showToast(error?.response?.data?.error || error.message || 'Signup failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell auth-page">
      <section className="auth-card glass-panel">
        <div className="auth-header">
          <span className="eyebrow">Create account</span>
          <h1>Join the premium medicine safety network.</h1>
          <p>Get instant scan access, personal settings, and secure history.</p>
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

          <label className="field-label">
            <span>Confirm password</span>
            <input
              value={confirmPassword}
              onChange={(evt) => setConfirmPassword(evt.target.value)}
              type="password"
              placeholder="Repeat your password"
              className="field"
              required
            />
            {errors.confirmPassword ? <span className="field-error">{errors.confirmPassword}</span> : null}
          </label>

          <button className="button button-cta" type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-footnote">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
