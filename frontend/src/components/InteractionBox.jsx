import { useMemo, useState } from 'react'
import { checkInteractions } from '../services/api'

function InteractionBox() {
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [result, setResult] = useState(null)

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
			setResult({
				safe: false,
				level: 'flagged',
				summary: 'Interaction API unavailable right now.',
				interactions: [],
			})
			setError('Could not fetch interaction check from server.')
		} finally {
			setLoading(false)
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

				<button className="button primary" type="submit" disabled={loading}>
					{loading ? 'Checking...' : 'Check Safety'}
				</button>
			</form>

			{error ? <p className="error-text">{error}</p> : null}

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
