function HowItWorks({
	onNavigate,
	scanStreak = 1,
	hasResult = false,
	primaryMedicine = 'No medicine scanned yet',
	quickStatus = 'ready',
}) {
	const features = [
		{
			id: 'scan',
			tag: 'Scan Image',
			title: 'Verify medicine instantly from strip or package photo',
			description: 'Scan and confirm medicine identity in seconds.',
			image: '/explore-scan.png',
			alt: 'Scan feature',
			path: '/verify-medicine',
		},
		{
			id: 'interactions',
			tag: 'Drug Interactions',
			title: 'Check risky combinations before taking doses',
			description: 'Get instant warnings for unsafe medicine combinations.',
			image: '/explore-interactions.png',
			alt: 'Drug interactions feature',
			path: '/interaction-check',
		},
		{
			id: 'heatmap',
			tag: 'Heatmap Insights',
			title: 'See local scan trends and potential risk clusters',
			description: 'Track area-wise medicine scan trends and risk patterns.',
			image: '/explore-heatmap.png',
			alt: 'Heatmap feature',
			path: '/heatmap',
		},
	]

	return (
		<section className="how-it-works-page" id="how-it-works">
			<div className="how-it-works-shell">
				{/* Added dashboard overview section */}
				<div className="explore-dashboard-container">
					<section className="hero-card">
						<p className="eyebrow">Scan. Verify.</p>
						<h1>
							Trust your <span>medicine.</span>
						</h1>
						<p className="subhead">
							Verify any medicine in seconds, compare affordable alternatives, and flag risky
							combinations before use.
						</p>

						<div className="hero-actions">
							<div className="scan-cta" onClick={() => onNavigate?.('/verify-medicine')} style={{ cursor: 'pointer' }}>
								<div className="scan-cta-icon">[]</div>
								<div>
									<strong>Scan medicine</strong>
									<span>Tap to check strip or package</span>
								</div>
							</div>
							<div className="hero-mini-stats">
								<div>
									<strong>{scanStreak}</strong>
									<span>day streak</span>
								</div>
								<div>
									<strong>{hasResult ? '1' : '0'}</strong>
									<span>latest scans</span>
								</div>
							</div>
						</div>

						<div className="hero-trust-row">
							<span>100% free</span>
							<span>Works offline</span>
							<span>Your data stays safe</span>
						</div>
					</section>

					<section className="shortcut-grid">
						<article className="shortcut-card" onClick={() => onNavigate?.('/verify-medicine')} style={{ cursor: 'pointer' }}>
							<p className="shortcut-label">My scans</p>
							<strong>{primaryMedicine}</strong>
							<span className={`shortcut-tag ${quickStatus}`}>{quickStatus}</span>
						</article>
						<article className="shortcut-card">
							<p className="shortcut-label">Reminders</p>
							<strong>Medicine schedule</strong>
							<span>Next alert handled in-app</span>
						</article>
						<article className="shortcut-card" onClick={() => onNavigate?.('/interaction-check')} style={{ cursor: 'pointer' }}>
							<p className="shortcut-label">Interactions</p>
							<strong>Check with AI</strong>
							<span>Review 2 or more medicines</span>
						</article>
						<article className="shortcut-card">
							<p className="shortcut-label">ASHA mode</p>
							<strong>Field-ready view</strong>
							<span>Works for rural health workers</span>
						</article>
					</section>
				</div>

				<p className="how-kicker">Explore</p>
				<h2>Everything you need to verify medicines</h2>
				<p className="how-subtitle">
					Three focused tools for identity checks, interaction safety, and local risk visibility.
				</p>

				<div className="how-feature-list" aria-label="Feature overview">
					{features.map((feature) => (
						<article
							key={feature.id}
							className="how-feature-card-combined"
							onClick={() => onNavigate?.(feature.path)}
							style={{ cursor: 'pointer' }}
						>
							<div className="how-feature-media">
								<img src={feature.image} alt={feature.alt} className="how-feature-image" />
							</div>
							<div className="how-feature-content">
								<p className="how-feature-tag">{feature.tag}</p>
								<h3>{feature.title}</h3>
								<p>{feature.description}</p>
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	)
}

export default HowItWorks
