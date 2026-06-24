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
