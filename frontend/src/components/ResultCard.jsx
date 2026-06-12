import { useEffect, useMemo } from 'react'

const colours = {
	genuine: { bg: '#E1F5EE', border: '#0F6E56', label: 'Genuine' },
	expired: { bg: '#FCEBEB', border: '#A32D2D', label: 'Expired - do not use' },
	flagged: { bg: '#FAEEDA', border: '#854F0B', label: 'Flagged - check with pharmacist' },
	not_found: { bg: '#F4F6FA', border: '#6B7280', label: 'Not found in database' },
}

function ResultCard({ result, onReset }) {
	const theme = useMemo(
		() => colours[result?.status] || colours.not_found,
		[result?.status],
	)

	const hindiText = result?.hindiText || result?.hindi_message || ''

	useEffect(() => {
		if (!hindiText || !window.speechSynthesis) return
		window.speechSynthesis.cancel()
		const utterance = new SpeechSynthesisUtterance(hindiText)
		utterance.lang = 'hi-IN'
		window.speechSynthesis.speak(utterance)

		return () => {
			window.speechSynthesis.cancel()
		}
	}, [hindiText])

	const replay = () => {
		if (!hindiText || !window.speechSynthesis) return
		window.speechSynthesis.cancel()
		const utterance = new SpeechSynthesisUtterance(hindiText)
		utterance.lang = 'hi-IN'
		window.speechSynthesis.speak(utterance)
	}

	const shareScreenshot = async () => {
		const section = document.getElementById('result-card')
		if (!section) return

		if (navigator.share) {
			await navigator.share({
				title: 'DawaCheck result',
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

		localStorage.setItem('dawacheck_reminder', JSON.stringify(reminder))

		if ('serviceWorker' in navigator) {
			const registration = await navigator.serviceWorker.ready
			await registration.showNotification('DawaCheck reminder set', {
				body: `We will remind you to recheck ${reminder.medicine} in 8 hours.`,
				icon: '/icon-192.png',
			})
		}
	}

	const localPrice = Number(result?.price || 0)
	const marketAverage = Number(result?.marketAverage || 0)
	const savings = Math.max(marketAverage - localPrice, 0)

	return (
		<section
			id="result-card"
			className="panel result-card"
			style={{ background: theme.bg, borderColor: theme.border }}
		>
			<div className="result-hero">
				<div className="result-icon" style={{ color: theme.border }}>
					OK
				</div>
				<div className="result-hero-copy">
					<p className="section-kicker">Verification result</p>
					<div className="result-top">
						<h2>{result?.medicine || 'Unknown medicine'}</h2>
						<span className="status-pill" style={{ borderColor: theme.border }}>
							{theme.label}
						</span>
					</div>
					<p className="result-summary">This medicine appears in the latest scan review.</p>
				</div>
			</div>

			<div className="detail-grid">
				<article>
					<span>Medicine</span>
					<strong>{result?.medicine || 'Unknown medicine'}</strong>
				</article>
				<article>
					<span>Status</span>
					<strong>{theme.label}</strong>
				</article>
				<article>
					<span>OCR capture</span>
					<strong>{result?.ocrText || 'No OCR text captured'}</strong>
				</article>
				<article>
					<span>Voice support</span>
					<strong>{hindiText ? 'Hindi summary ready' : 'No Hindi summary yet'}</strong>
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

			<div className="action-row">
				<button className="button primary" type="button" onClick={replay}>
					Replay Hindi Voice
				</button>
				<button className="button success" type="button" onClick={scheduleReminder}>
					Remind In 8 Hours
				</button>
				<button className="button ghost" type="button" onClick={shareScreenshot}>
					Share Result
				</button>
				<button className="button" type="button" onClick={onReset}>
					Scan Another
				</button>
			</div>
		</section>
	)
}

export default ResultCard
