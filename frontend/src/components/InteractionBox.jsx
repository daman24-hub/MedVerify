import { useState, useEffect, useRef } from 'react'
import { checkInteractions } from '../services/api'
import './InteractionBox.css'

const REMINDER_STORAGE_KEY = 'medverify_interaction_reminders'

function InteractionBox() {
	const [medicines, setMedicines] = useState(['', ''])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [result, setResult] = useState(null)

	const [reminderTime, setReminderTime] = useState('')
	const [reminderMedicine, setReminderMedicine] = useState('')
	const [reminderSaved, setReminderSaved] = useState(false)
	const [reminderError, setReminderError] = useState('')
	const timeoutRef = useRef(null)

	const updateMedicine = (index, value) => {
		const updated = [...medicines]
		updated[index] = value
		setMedicines(updated)
		setResult(null)
		setError('')
		setReminderSaved(false)
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
			setResult(response)
			setReminderMedicine(filled[0])
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
			: result.level === 'high' || result.level === 'flagged' || result.level === 'expired'
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

	const loadReminders = () => {
		try {
			const raw = localStorage.getItem(REMINDER_STORAGE_KEY)
			return raw ? JSON.parse(raw) : []
		} catch {
			return []
		}
	}

	const saveReminder = async (event) => {
		event.preventDefault()
		setReminderError('')

		if (!reminderMedicine.trim()) {
			setReminderError('Choose which medicine this reminder is for.')
			return
		}
		if (!reminderTime) {
			setReminderError('Pick a time for the reminder.')
			return
		}
		if (!('Notification' in window)) {
			setReminderError('Notifications are not supported on this browser.')
			return
		}

		let permission = Notification.permission
		if (permission !== 'granted') {
			permission = await Notification.requestPermission()
		}
		if (permission !== 'granted') {
			setReminderError('Enable notification permission to set a reminder.')
			return
		}

		const [hours, minutes] = reminderTime.split(':').map(Number)
		const due = new Date()
		due.setHours(hours, minutes, 0, 0)
		if (due.getTime() <= Date.now()) {
			due.setDate(due.getDate() + 1) // time already passed today -> schedule for tomorrow
		}

		const reminder = {
			id: `${Date.now()}`,
			medicine: reminderMedicine.trim(),
			dueAt: due.getTime(),
		}

		localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify([...loadReminders(), reminder]))

		const delay = reminder.dueAt - Date.now()
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(async () => {
			if ('serviceWorker' in navigator) {
				const registration = await navigator.serviceWorker.ready
				registration.showNotification('MedVerify reminder', {
					body: `Time to take ${reminder.medicine}.`,
					icon: '/icon-192.png',
				})
			} else {
				new Notification('MedVerify reminder', { body: `Time to take ${reminder.medicine}.` })
			}
		}, delay)

		setReminderSaved(true)
	}

	const cancelReminder = () => {
		if (timeoutRef.current) clearTimeout(timeoutRef.current)
		setReminderSaved(false)
		setReminderTime('')
	}

	useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, [])

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
									{result.interactions.map((item, i) => <li key={i}>{item}</li>)}
								</ul>
							)}
						</div>
					</div>
				)}

				<form onSubmit={submit} className="ib-form">
					<p className="ib-section-label">Your Medicines</p>
					<ul className="ib-med-list">
						{medicines.map((med, index) => (
							<li key={index} className={`ib-med-row ${med.trim() ? 'ib-med-row--filled' : ''}`}>
								<span className="ib-med-num">{index + 1}</span>
								<span className="ib-med-icon" aria-hidden="true">💊</span>
								<input
									className="ib-med-input"
									type="text"
									placeholder={`Medicine ${index + 1} name`}
									value={med}
									onChange={(e) => updateMedicine(index, e.target.value)}
								/>
								{med.trim() && (
									<button type="button" className="ib-remove-btn" onClick={() => removeMedicine(index)} aria-label={`Remove medicine ${index + 1}`}>×</button>
								)}
							</li>
						))}
					</ul>

					{error && <p className="ib-error">{error}</p>}

					<button className="ib-submit-btn" type="submit" disabled={loading}>
						{loading ? 'Checking…' : 'Check Safety'}
					</button>
				</form>

				{result && (
					<div className="ib-reminder">
						<p className="ib-section-label">Set a Reminder</p>
						{!reminderSaved ? (
							<form className="ib-reminder-form" onSubmit={saveReminder}>
								<div className="ib-reminder-row">
									<select className="ib-reminder-select" value={reminderMedicine} onChange={(e) => setReminderMedicine(e.target.value)}>
										<option value="">Choose medicine</option>
										{filled.map((name) => <option key={name} value={name}>{name}</option>)}
									</select>
									<input className="ib-reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
									<button className="ib-reminder-btn" type="submit">Set Reminder</button>
								</div>
								{reminderError && <p className="ib-error">{reminderError}</p>}
							</form>
						) : (
							<div className="ib-reminder-confirm">
								<span>🔔 Reminder set for {reminderMedicine} at {reminderTime}</span>
								<button type="button" className="ib-reminder-cancel" onClick={cancelReminder}>Cancel</button>
							</div>
						)}
					</div>
				)}
			</section>

			<div className="ib-tip-card">
				<div className="ib-tip-icon">🔔</div>
				<p className="ib-tip-text">Always consult your doctor before starting or stopping any medicine.</p>
			</div>
		</div>
	)
}

export default InteractionBox