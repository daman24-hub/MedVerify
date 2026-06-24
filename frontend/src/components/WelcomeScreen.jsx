import './WelcomeScreen.css'
import LandingHero from './LandingHero'

function WelcomeScreen({ onGetStarted }) {
	return (
		<main className="welcome-site">
			{/* Decorative Floating Blobs for Motion Graphics Background */}
			<div className="bg-blob blob-one" aria-hidden="true" />
			<div className="bg-blob blob-two" aria-hidden="true" />
			<div className="bg-blob blob-three" aria-hidden="true" />

			<div className="welcome-page">
				{/* Hero Section */}
				<LandingHero onGetStarted={onGetStarted} />

				{/* What is MedVerify & Why Choose It (Glassmorphic Cards) */}
				<section className="welcome-section features-section">
					<div className="section-container">
						<p className="section-kicker">Why Choose Us</p>
						<h2 className="section-title">What is MedVerify & Why Choose It?</h2>
						<p className="section-subtitle">
							Substandard or counterfeit medicines can be toxic. MedVerify is built to safeguard families by providing instant data transparency.
						</p>

						<div className="glass-grid">
							<div className="glass-card feature-card">
								<div className="glass-card-icon">🛡️</div>
								<h3>100% Reliable Checks</h3>
								<p>Cross-references scan text with Indian drug registries to instantly check if the manufacturer and drug status are approved or flagged.</p>
							</div>
							<div className="glass-card feature-card">
								<div className="glass-card-icon">💰</div>
								<h3>Affordability Insight</h3>
								<p>Empowers patients by comparing brand prices with Jan Aushadhi generic options, unlocking potential savings of up to 50% to 90%.</p>
							</div>
							<div className="glass-card feature-card">
								<div className="glass-card-icon">⚡</div>
								<h3>Double-Dosage Prevention</h3>
								<p>Flags duplicate active ingredients and harmful drug-to-drug interactions instantly, preventing accidental toxic overdosing.</p>
							</div>
						</div>
					</div>
				</section>

				{/* Our Trusted Data Sources */}
				<section className="welcome-section sources-section">
					<div className="section-container">
						<p className="section-kicker">Data Transparency</p>
						<h2 className="section-title">Official Registry Integrations</h2>
						<p className="section-subtitle">
							We extract safety and pricing guidelines directly from verified government databases.
						</p>

						<div className="sources-split">
							<div className="source-item glass-card">
								<div className="source-badge cdsco-badge">CDSCO Approved</div>
								<h3>Central Drugs Standard Control Organisation</h3>
								<p>Our database contains over 15,000+ approved drugs mapped against CDSCO standards. If a scanned drug isn't listed, it is flagged as suspect to protect users from unverified imports or banned salts.</p>
							</div>
							<div className="source-item glass-card">
								<div className="source-badge pmbjp-badge">PMBJP Alternatives</div>
								<h3>Pradhan Mantri Bhartiya Janaushadhi Pariyojana</h3>
								<p>Direct mapping connects expensive brand names to generic options, letting you search equivalent salt formulations and compare costs instantly. Lower prices do not mean lower quality.</p>
							</div>
						</div>
					</div>
				</section>

				{/* User Guide in English & Hindi */}
				<section className="welcome-section guide-section">
					<div className="section-container">
						<p className="section-kicker">User Guide</p>
						<h2 className="section-title">How to Use MedVerify / उपयोग कैसे करें</h2>
						<p className="section-subtitle">
							Follow these simple steps in English or Hindi to verify your medicine and confirm safety.
						</p>

						<div className="guide-split">
							{/* English Guide */}
							<div className="guide-column glass-card">
								<div className="guide-lang-header">
									<span className="lang-indicator">🇬🇧</span>
									<h3>English Guide</h3>
								</div>
								<div className="guide-steps-list">
									<div className="guide-step">
										<span className="step-num">1</span>
										<div>
											<h4>Scan or Type Name</h4>
											<p>Capture a photo of the medicine strip or type the name manually into the verify tab.</p>
										</div>
									</div>
									<div className="guide-step">
										<span className="step-num">2</span>
										<div>
											<h4>Check Verification Result</h4>
											<p>Review the approval status (Genuine, Suspect, or Expired) and manufacturer detail.</p>
										</div>
									</div>
									<div className="guide-step">
										<span className="step-num">3</span>
										<div>
											<h4>Compare Prices & Savings</h4>
											<p>Look at the brand price and discover cheap generic alternatives to save money.</p>
										</div>
									</div>
									<div className="guide-step">
										<span className="step-num">4</span>
										<div>
											<h4>Scan Drug Interactions</h4>
											<p>Enter 2 or more medicines to check if they have duplicates or dangerous combinations.</p>
										</div>
									</div>
								</div>
							</div>

							{/* Hindi Guide */}
							<div className="guide-column glass-card">
								<div className="guide-lang-header">
									<span className="lang-indicator">🇮🇳</span>
									<h3>हिंदी निर्देश (Hindi Guide)</h3>
								</div>
								<div className="guide-steps-list">
									<div className="guide-step">
										<span className="step-num">१</span>
										<div>
											<h4>स्कैन करें या नाम लिखें</h4>
											<p>दवा के पत्ते की स्पष्ट फोटो खींचें या नाम लिखकर सर्च करें।</p>
										</div>
									</div>
									<div className="guide-step">
										<span className="step-num">२</span>
										<div>
											<h4>सत्यापन परिणाम देखें</h4>
											<p>दवा की सुरक्षा स्थिति (असली, संदिग्ध, या एक्सपायर्ड) और निर्माता की पुष्टि करें।</p>
										</div>
									</div>
									<div className="guide-step">
										<span className="step-num">३</span>
										<div>
											<h4>कीमत और बचत देखें</h4>
											<p>ब्रांड के दाम की तुलना करें और कम कीमत वाली जेनेरिक दवाओं के विकल्प खोजें।</p>
										</div>
									</div>
									<div className="guide-step">
										<span className="step-num">४</span>
										<div>
											<h4>दुष्प्रभावों की जांच करें</h4>
											<p>दो दवाओं के हानिकारक आपसी प्रभाव (डबल-डोज़) से बचने के लिए सुरक्षा टेस्ट करें।</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>
				
				{/* Call to action at bottom */}
				<section className="welcome-section cta-section">
					<div className="cta-glass-card glass-card">
						<h2>Ready to Verify Your Medicine?</h2>
						<p>Protect your family from toxic doses and check generic alternatives instantly.</p>
						<button className="btn-primary hero-cta" onClick={onGetStarted}>
							Start Verifying Now
						</button>
					</div>
				</section>
			</div>
		</main>
	)
}

export default WelcomeScreen
