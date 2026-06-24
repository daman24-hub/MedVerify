import { useState } from 'react'
import { register } from '../services/api'
import Logo from './Logo'
import './Auth.css'

export default function Signup({ onSignupSuccess, onSwitchToLogin }) {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e) => {
		e.preventDefault()
		setError('')

		if (password !== confirmPassword) {
			setError('Passwords do not match')
			return
		}

		if (password.length < 6) {
			setError('Password must be at least 6 characters')
			return
		}

		setLoading(true)

		try {
			const response = await register(email, password, name)
			// FIXED: parse fetch response directly without response.data
			localStorage.setItem('authToken', response.token)
			onSignupSuccess(response.user)
		} catch (err) {
			// FIXED: handle fetch error message
			setError(err.message || 'Signup failed')
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
				<h1>Create Account</h1>
				<p className="auth-subtitle">Join us to verify medicines</p>

				<form onSubmit={handleSubmit} className="auth-form">
					<div className="form-group">
						<label htmlFor="name">Full Name</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="John Doe"
							autoComplete="name"
							required
						/>
					</div>

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
							autoComplete="new-password"
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="confirmPassword">Confirm Password</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder="••••••••"
							autoComplete="new-password"
							required
						/>
					</div>

					{error && <div className="error-message">{error}</div>}

					<button type="submit" className="auth-button" disabled={loading}>
						{loading ? 'Creating account...' : 'Sign Up'}
					</button>
				</form>

				<p className="auth-switch">
					Already have an account?{' '}
					<button type="button" onClick={onSwitchToLogin} className="link-button">
						Sign in
					</button>
				</p>
			</div>
		</div>
	)
}
