import { useEffect, useMemo } from 'react'
import { showToast } from '../services/toast' // FIXED: import showToast
import { updateVerifyStatus } from '../services/api' // FIXED: import updateVerifyStatus

const colours = {
	genuine: { bg: '#E1F5EE', border: '#0F6E56', label: 'Genuine' },
	expired: { bg: '#FCEBEB', border: '#A32D2D', label: 'Expired - do not use' },
	flagged: { bg: '#FAEEDA', border: '#854F0B', label: 'Flagged - check with pharmacist' },
	not_found: { bg: '#F4F6FA', border: '#6B7280', label: 'Not found in database' },
}

function ResultCard({ result, onReset }) {
	const theme = useMemo(() => colours[result?.status] || colours.not_found, [result?.status])

	const hindiText = result?.hindiText || result?.hindi_message || ''

	const speakText = (text, lang = 'hi-IN') => {
		// FIXED: must be triggered by user gesture — never call on page load
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = lang;
		utterance.rate = 0.9;

		// Cancel any ongoing speech first
		window.speechSynthesis.cancel();
		window.speechSynthesis.speak(utterance);
	};

	const handleFeedback = async (verified) => {
		// FIXED: submit verification review feedback to database
		if (!result?.id) {
			showToast('No database OCR record found for feedback.', 'error');
			return;
		}
		try {
			await updateVerifyStatus(result.id, verified);
			showToast(`Persisted verification feedback: ${verified ? 'Verified' : 'Rejected'}`, 'success');
		} catch (err) {
			showToast('Failed to persist verification status.', 'error');
		}
	}

	const shareScreenshot = async () => {
		const section = document.getElementById('result-card')
		if (!section) return

		if (navigator.share) {
			await navigator.share({
				title: 'MedVerify result',
				text: `${result?.medicine || 'Medicine'}: ${theme.label}`,
			})
			return
		}

		window.print()
	}

	const scheduleReminder = async () => {
		if (!('Notification' in window)) {
			return
		}

		let permission = Notification.permission
		if (permission !== 'granted') {
			permission = await Notification.requestPermission()
		}

		if (permission !== 'granted') {
			return
		}

		const reminder = {
			medicine: result?.medicine || 'Medicine',
			dueAt: Date.now() + 8 * 60 * 60 * 1000,
		}

		localStorage.setItem('medverify_reminder', JSON.stringify(reminder))

		if ('serviceWorker' in navigator) {
			const registration = await navigator.serviceWorker.ready
			await registration.showNotification('MedVerify reminder set', {
				body: `We will remind you to recheck ${reminder.medicine} in 8 hours.`,
				icon: '/icon-192.png',
			})
		}
	}

	const localPrice = Number(result?.price || 0)
	const marketAverage = Number(result?.marketAverage || 0)
	const savings = Math.max(marketAverage - localPrice, 0)

	return (
		<section id="result-card" className="panel result-card result-card--light" aria-live="polite">
			<div className="result-hero">
				<div className="result-icon" aria-hidden="true">OK</div>
				<div className="result-hero-copy">
					<p className="section-kicker">Verification result</p>
					<div className="result-top">
						<h2 className="result-title">{result?.medicine || 'Unknown medicine'}</h2>
						<span className={`status-badge ${result?.status || ''}`} role="status">
							{theme.label}
						</span>
					</div>
					<p className="result-summary">This medicine appears in the latest scan review.</p>
				</div>
			</div>

			<div className="detail-grid">
				<article>
					<span className="label">Medicine</span>
					<strong className="value">{result?.medicine || 'Unknown medicine'}</strong>
				</article>
				<article>
					<span className="label">Status</span>
					<strong className="value">{theme.label}</strong>
				</article>
				<article>
					<span className="label">OCR capture</span>
					<strong className="value">{result?.ocrText || 'No OCR text captured'}</strong>
				</article>
				<article>
					<span className="label">Voice support</span>
					<strong className="value">{hindiText ? 'Hindi summary ready' : 'No Hindi summary yet'}</strong>
				</article>
			</div>

			<div className="price-grid">
				<article>
					<h3>Strip price</h3>
					<p>Rs. {localPrice.toFixed(2)}</p>
				</article>
				<article>
					<h3>Market average</h3>
					<p>Rs. {marketAverage.toFixed(2)}</p>
				</article>
				<article>
					<h3>Potential savings</h3>
					<p>Rs. {savings.toFixed(2)}</p>
				</article>
			</div>

			<div className="info-banner">
				<div>
					<strong>Affordable alternative insight</strong>
					<p>
						Saving estimate is based on your scan result versus the current market average.
					</p>
				</div>
				<span>You can save Rs. {savings.toFixed(2)}</span>
			</div>

			{result?.genericAlternatives && result.genericAlternatives.length > 0 ? (
				<div className="alternatives-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
					<h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#132b20', marginBottom: '0.75rem' }}>
						Affordable Generic Alternatives (PMBJP)
					</h3>
					<div className="alternatives-list" style={{ display: 'grid', gap: '0.8rem' }}>
						{result.genericAlternatives.map((alt, index) => (
							<div 
								key={index} 
								className="alt-card" 
								style={{ 
									display: 'flex', 
									justifyContent: 'space-between', 
									alignItems: 'center', 
									padding: '0.85rem 1rem', 
									background: 'rgba(240, 248, 245, 0.65)', 
									border: '1px solid #d0ebd8', 
									borderRadius: '12px' 
								}}
							>
								<div>
									<strong style={{ display: 'block', color: '#0f6f3c', fontSize: '0.94rem', fontWeight: '800' }}>{alt.name}</strong>
									<span style={{ fontSize: '0.78rem', color: '#6B7280' }}>by {alt.manufacturer || 'Unknown Manufacturer'}</span>
								</div>
								<div style={{ textAlign: 'right' }}>
									<strong style={{ display: 'block', color: '#132b20', fontSize: '0.94rem', fontWeight: '800' }}>Rs. {Number(alt.price || 0).toFixed(2)}</strong>
									<span 
										className={`status-badge-small ${alt.isGenuine ? 'genuine' : 'flagged'}`} 
										style={{ 
											fontSize: '0.68rem', 
											padding: '0.15rem 0.4rem', 
											borderRadius: '999px',
											background: alt.isGenuine ? '#E1F5EE' : '#FAEEDA',
											color: alt.isGenuine ? '#0F6E56' : '#854F0B',
											border: `1px solid ${alt.isGenuine ? '#0F6E56' : '#854F0B'}`,
											fontWeight: 'bold',
											display: 'inline-block',
											marginTop: '0.2rem'
										}}
									>
										{alt.isGenuine ? 'Genuine' : 'Unverified'}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			) : (
				<div className="alternatives-section" style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee', textAlign: 'center' }}>
					<p style={{ margin: 0, fontSize: '0.88rem', color: '#888' }}>
						No cheaper generic alternatives found for this salt formulation.
					</p>
				</div>
			)}

			{result?.advice ? <p className="advice">{result.advice}</p> : null}

			{/* FIXED: approve / reject buttons to persist verification feedback */}
			<div className="verify-feedback-row" style={{ marginTop: '1.25rem', marginBottom: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
				<button 
					type="button" 
					onClick={() => handleFeedback(true)}
					style={{ padding: '0.6rem 1.2rem', background: '#2ecc71', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
				>
					✓ Approve Verification
				</button>
				<button 
					type="button" 
					onClick={() => handleFeedback(false)}
					style={{ padding: '0.6rem 1.2rem', background: '#e74c3c', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
				>
					✗ Reject Verification
				</button>
			</div>

			<div className="action-row result-actions">
				<button className="button button-secondary" type="button" onClick={() => speakText(hindiText, 'hi-IN')} aria-label="Listen Hindi voice">
					🔊 सुनें (Listen) {/* FIXED: user click gesture speech check */}
				</button>
				<button className="button button-cta" type="button" onClick={scheduleReminder} aria-label="Set reminder in 8 hours">
					Remind In 8 Hours
				</button>
				<button className="button button-ghost" type="button" onClick={shareScreenshot} aria-label="Share result">
					Share Result
				</button>
				<button className="button button-secondary" type="button" onClick={onReset} aria-label="Scan another">
					Scan Another
				</button>
			</div>
		</section>
	)
}

export default ResultCard
