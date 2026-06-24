import { useState } from 'react'
import CameraScanner from './CameraScanner'
import VerifyResult from './VerifyResult'
import './VerifyMedicine.css'

export default function VerifyMedicine() {
	const [searchedName, setSearchedName] = useState(null)
	const [typedName, setTypedName] = useState('')

	const handleScanComplete = (medicineName, rawText) => {
		setSearchedName(medicineName)
	}

	const handleSearch = (e) => {
		e.preventDefault()
		if (typedName.trim()) {
			setSearchedName(typedName.trim())
		}
	}

	const reset = () => {
		setSearchedName(null)
		setTypedName('')
	}

	return (
		<div className="vm-page">
			<div className="vm-hero">
				<p className="vm-kicker">Medicine Verification</p>
				<h1 className="vm-title">Verify your medicine instantly</h1>
				<p className="vm-sub">
					Scan a strip or package photo, or type the name manually to check it against our database.
				</p>
			</div>

			<div className="vm-content">
				{!searchedName ? (
					<div className="vm-controls-card">
						<form onSubmit={handleSearch} className="vm-search-form">
							<input
								type="text"
								placeholder="Type medicine name (e.g. Dolo 650, Calpol, Metformin)..."
								value={typedName}
								onChange={(e) => setTypedName(e.target.value)}
								className="vm-search-input"
							/>
							<button type="submit" className="vm-search-btn">
								Verify
							</button>
						</form>

						<div className="vm-divider">
							<span>OR SCAN IMAGE</span>
						</div>

						<div className="vm-scanner-container">
							<CameraScanner onScanComplete={handleScanComplete} loading={false} />
						</div>
					</div>
				) : (
					<VerifyResult medicineName={searchedName} onReset={reset} />
				)}
			</div>
		</div>
	)
}
