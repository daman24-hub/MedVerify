import { useMemo, useState } from 'react'
import { checkInteractions, verifyMedicineByName } from '../services/api'
import { showToast } from '../services/toast'

function InteractionBox() {
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [result, setResult] = useState(null)
	const [verifyLoading, setVerifyLoading] = useState(false)
	const [verifyResult, setVerifyResult] = useState(null)

	const medicineList = useMemo(
		() =>
			input
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean),
		[input],
	)

	const submit = async (event) => {
		event.preventDefault()
		if (medicineList.length < 2) {
			setError('Enter at least 2 medicine names separated by commas.')
			return
		}

		setLoading(true)
		setError('')

		try {
			const response = await checkInteractions(medicineList)
			setResult(response.data)
		} catch (apiError) {
			// Fallback: perform a simple local interaction analysis when API is unavailable
			const fallback = localFallbackAnalysis(medicineList)
			setResult(fallback)
			setError('Could not reach interaction service; showing local analysis.')
		} finally {
			setLoading(false)
		}
	}

	const handleVerifyMedicine = async (medicineName) => {
		const name = String(medicineName || medicineList[0] || '').trim()
		if (!name) {
			showToast('Please provide a medicine name to verify.', 'error')
			return
		}

		setVerifyLoading(true)
		setVerifyResult(null)
		try {
			const resp = await verifyMedicineByName(name)
			setVerifyResult(resp?.data || null)
			showToast('Verification completed.', 'success')
		} catch (err) {
			console.error('verifyMedicineByName error', err)
			showToast('Verification failed. Try again.', 'error')
		} finally {
			setVerifyLoading(false)
		}
	}

	// Simple local heuristic for basic interaction checks
	function localFallbackAnalysis(list) {
		const lower = list.map((s) => s.toLowerCase())
		const interactions = []
		let safe = true

		// Define some known risky pairs (not exhaustive)
		const rules = [
			{ a: 'warfarin', b: 'aspirin', level: 'danger', note: 'Increased bleeding risk when combined with aspirin.' },
			{ a: 'warfarin', b: 'ibuprofen', level: 'danger', note: 'NSAIDs can increase bleeding risk with warfarin.' },
			{ a: 'metformin', b: 'contrast', level: 'caution', note: 'Contrast media can affect kidney function; monitor closely.' },
			{ a: 'paracetamol', b: 'acetaminophen', level: 'safe', note: 'These are synonyms; avoid double-dosing.' },
			{ a: 'paracetamol', b: 'ibuprofen', level: 'caution', note: 'Generally used together but watch dosing and patient factors.' },
		]

		for (let i = 0; i < lower.length; i += 1) {
			for (let j = i + 1; j < lower.length; j += 1) {
				const a = lower[i]
				const b = lower[j]
				for (const rule of rules) {
					if ((a.includes(rule.a) && b.includes(rule.b)) || (a.includes(rule.b) && b.includes(rule.a))) {
						interactions.push(`${list[i]} + ${list[j]}: ${rule.note}`)
						if (rule.level === 'danger' || rule.level === 'flagged') safe = false
					}
				}
			}
		}

		const summary = interactions.length
			? interactions.slice(0, 3).join(' \n')
			: 'No known interactions found in the local rule set. Consult a clinician for final advice.'

		return {
			safe,
			level: safe ? 'genuine' : 'flagged',
			summary,
			interactions,
		}
	}

	const level = result?.level || (result?.safe ? 'genuine' : 'flagged')

	return (
		<section className="panel interaction-box">
			<div className="panel-heading">
				<div>
					<p className="section-kicker">Safety review</p>
					<h2>Drug Interactions</h2>
				</div>
				<span className="mini-badge">AI</span>
			</div>
			<form onSubmit={submit}>
				<label htmlFor="medicines-input" className="label">
					Add medicines separated by commas
				</label>
				<input
					id="medicines-input"
					type="text"
					className="field"
					placeholder="Paracetamol, Ibuprofen"
					value={input}
					onChange={(event) => setInput(event.target.value)}
				/>

				{medicineList.length > 0 ? (
					<div className="chip-row">
						{medicineList.map((medicine) => (
							<span className="medicine-chip" key={medicine}>
								{medicine}
							</span>
						))}
					</div>
				) : null}

				<div className="flex items-center gap-3">
					{medicineList.length >= 1 ? (
						<button
							type="button"
							className="button button-secondary"
							onClick={() => handleVerifyMedicine(medicineList[0])}
							disabled={verifyLoading}
						>
							{verifyLoading ? 'Verifying…' : 'Verify'}
						</button>
					) : null}
					<button className="button primary" type="submit" disabled={loading}>
						{loading ? 'Checking...' : 'Check Safety'}
					</button>
				</div>
			</form>

			{error ? <p className="error-text">{error}</p> : null}

			{verifyResult ? (
				<div className="panel-wrapper mt-4 p-4 rounded-lg border border-gray-100 bg-white">
					<h4 className="text-sm font-bold">Verification</h4>
					<p className="text-sm text-slate-700 mt-2">{verifyResult?.medicine || 'Result'}</p>
					<p className="text-sm text-slate-600 mt-1">Status: {verifyResult?.status || 'unknown'}</p>
					{verifyResult?.advice ? <p className="mt-2 text-sm text-slate-600">{verifyResult.advice}</p> : null}
				</div>
			) : null}

			{result ? (
				<div className={`interaction-result ${level}`}>
					<h3>{result?.safe ? 'Safe combination' : 'Use caution'}</h3>
					<p>{result?.summary || 'No interaction details were returned.'}</p>

					{Array.isArray(result?.interactions) && result.interactions.length > 0 ? (
						<ul>
							{result.interactions.map((item, index) => (
								<li key={`${item}-${index}`}>{item}</li>
							))}
						</ul>
					) : null}
				</div>
			) : null}
		</section>
	)
}

export default InteractionBox
