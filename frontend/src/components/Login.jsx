import { useState } from 'react'
import { login } from '../services/api'
import Logo from './Logo'
import './Auth.css'

export default function Login({ onLoginSuccess, onSwitchToSignup }) {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			const response = await login(email, password)
			// FIXED: parse fetch response directly without response.data
			localStorage.setItem('authToken', response.token)
			onLoginSuccess(response.user)
		} catch (err) {
			// FIXED: handle fetch error message
			setError(err.message || 'Login failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="auth-container">
			<div className="auth-card">
				<div className="auth-brand" aria-hidden="true">
					<Logo size={36} />
					<span>MedVerify</span>
				</div>
				<h1>Welcome Back</h1>
				<p className="auth-subtitle">Sign in to your account</p>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="email">Email Address</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							autoComplete="email"
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="password">Password</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder="••••••••"
							autoComplete="current-password"
							required
						/>
					</div>

					{error && <div className="error-message">{error}</div>}

					<button type="submit" className="auth-button" disabled={loading}>
						{loading ? 'Signing in...' : 'Sign In'}
					</button>
				</form>

				<p className="auth-switch">
					Don't have an account?{' '}
					<button type="button" onClick={onSwitchToSignup} className="link-button">
						Sign up
					</button>
				</p>
			</div>
		</div>
	)
}
