import { useState } from 'react'
import { checkInteractions } from '../services/api'
import './InteractionBox.css'

const MAX_MEDICINES = 2

function InteractionBox() {
	const [medicines, setMedicines] = useState(['', ''])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [result, setResult] = useState(null)
	const [verifyLoading, setVerifyLoading] = useState(false)
	const [verifyResult, setVerifyResult] = useState(null)

	const updateMedicine = (index, value) => {
		const updated = [...medicines]
		updated[index] = value
		setMedicines(updated)
		setResult(null)
		setError('')
	}

	const removeMedicine = (index) => {
		const updated = [...medicines]
		updated[index] = ''
		setMedicines(updated)
		setResult(null)
		setError('')
	}

	const submit = async (event) => {
		event.preventDefault()
		const filled = medicines.map((m) => m.trim()).filter(Boolean)
		if (filled.length < 2) {
			setError('Enter both medicine names before checking.')
			return
		}
		setLoading(true)
		setError('')
		try {
			const response = await checkInteractions(filled)
			setResult(response) // FIXED: parse response directly as axios returns response.data directly
		} catch {
			setResult({
				safe: false,
				level: 'high',
				summary: 'Interaction data unavailable right now. Please try again later.',
				interactions: [],
			})
		} finally {
			setLoading(false)
		}
	}

	const riskLevel = result
		? result.safe
			? 'safe'
			: result.level === 'high' || result.level === 'flagged' || result.level === 'expired' // FIXED: support expired/dangerous level
				? 'high'
				: 'moderate'
		: null

	const riskLabel =
		riskLevel === 'safe'
			? 'Safe Combination'
			: riskLevel === 'high'
				? 'High Risk Interaction'
				: 'Moderate Interaction'

	const filled = medicines.map((m) => m.trim()).filter(Boolean)
	const pair = filled.length >= 2 ? `Between ${filled[0]} and ${filled[1]}` : ''

	return (
		<div className="ib-page">
			<div className="ib-hero">
				<p className="ib-hero-kicker">Drug Interaction Checker</p>
				<h1 className="ib-hero-title">Are your medicines safe together?</h1>
				<p className="ib-hero-sub">Enter two medicines below to instantly check for known interaction risks.</p>
			</div>

			<section className="ib-card">
				<div className="ib-header">
					<div className="ib-header-top">
						<span className="ib-icon">💊</span>
						<div>
							<p className="ib-kicker">Safety review</p>
							<h2 className="ib-title">Drug Interactions</h2>
						</div>
					</div>
					<p className="ib-header-desc">Check if two medicines are safe to take together</p>
				</div>

				{result && riskLevel !== null && (
					<div className={`ib-alert ib-alert--${riskLevel}`}>
						<span className="ib-alert-icon">{riskLevel === 'safe' ? '✓' : '⚠'}</span>
						<div>
							<p className="ib-alert-label">{riskLabel}</p>
							{pair && <p className="ib-alert-sub">{pair}</p>}
							{result.summary && <p className="ib-alert-summary">{result.summary}</p>}
							{Array.isArray(result.interactions) && result.interactions.length > 0 && (
								<ul className="ib-interactions-list">
									{result.interactions.map((item, i) => (
										<li key={i}>{item}</li>
									))}
								</ul>
							)}
						</div>
					</div>
				)}

				<form onSubmit={submit} className="ib-form">
					<p className="ib-section-label">Your Medicines</p>
					<ul className="ib-med-list">
						{medicines.map((med, index) => (
							<li key={index} className="ib-med-row">
								<span className="ib-med-num">{index + 1}</span>
								<input
									className="ib-med-input"
									type="text"
									placeholder={`Medicine ${index + 1} name`}
									value={med}
									onChange={(e) => updateMedicine(index, e.target.value)}
								/>
								{med.trim() && (
									<button
										type="button"
										className="ib-remove-btn"
										onClick={() => removeMedicine(index)}
										aria-label={`Remove medicine ${index + 1}`}
									>
										×
									</button>
								)}
							</li>
						))}
					</ul>

					{error && <p className="ib-error">{error}</p>}

					<button className="ib-submit-btn" type="submit" disabled={loading}>
						{loading ? 'Checking…' : 'Check Safety'}
					</button>
				</form>
			</section>

			<div className="ib-tip-card">
				<div className="ib-tip-icon">🔔</div>
				<p className="ib-tip-text">
					Always consult your doctor before starting or stopping any medicine.
				</p>
			</div>
		</div>
	)
}

export default InteractionBox
