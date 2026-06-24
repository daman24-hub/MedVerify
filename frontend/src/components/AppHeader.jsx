import { useState } from 'react'
import Logo from './Logo'
import './AppHeader.css'

export default function AppHeader({ currentUser, onLogout, onGetStarted, onNavigate, currentPath }) {
	const [menuOpen, setMenuOpen] = useState(false)

	const navLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Explore', href: '/explore' },
		{ label: 'Verify Medicine', href: '/verify-medicine' },
		{ label: 'Interaction Check', href: '/interaction-check' },
		{ label: 'Counterfeit Heatmap', href: '/heatmap' },
		{ label: 'Contact', href: '/contact' },
	]

	const handleLink = (event, href) => {
		if (!onNavigate || href === '#') return
		event.preventDefault()
		setMenuOpen(false)
		onNavigate(href)
	}

	return (
		<header className="app-header">
			<div className="header-container">
				<div className="header-brand" onClick={() => onNavigate?.('/')}>
					<Logo size={48} />
					<h1>MedVerify</h1>
				</div>

				<nav className={`header-nav ${menuOpen ? 'open' : ''}`}>
					{navLinks.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className={`nav-link ${currentPath === link.href ? 'active' : ''}`}
							onClick={(e) => handleLink(e, link.href)}
						>
							{link.label}
						</a>
					))}
				</nav>

				<div className="header-actions">
					{currentUser ? (
						<>
							<span className="user-name">{currentUser.name}</span>
							<button className="btn-secondary" onClick={onLogout}>
								Logout
							</button>
						</>
					) : (
						<button className="btn-primary" onClick={onGetStarted}>
							Get Started
						</button>
					)}
					<button
						className="hamburger-btn"
						aria-label={menuOpen ? 'Close menu' : 'Open menu'}
						aria-expanded={menuOpen}
						onClick={() => setMenuOpen((v) => !v)}
					>
						<span className={`ham-bar ${menuOpen ? 'open' : ''}`} />
						<span className={`ham-bar ${menuOpen ? 'open' : ''}`} />
						<span className={`ham-bar ${menuOpen ? 'open' : ''}`} />
					</button>
				</div>
			</div>
		</header>
	)
}

