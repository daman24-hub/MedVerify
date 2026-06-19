import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <main className="page-shell landing-page">
      <section className="hero-panel glass-panel">
        <div className="hero-copy">
          <span className="eyebrow">Luxury medicine verification</span>
          <h1>Trust every dose with premium accuracy.</h1>
          <p className="hero-text">
            DawaCheck blends powerful OCR scanning, AI-driven interaction warnings, and live counterfeit heatmaps into a luxe dark interface.
          </p>
          <div className="hero-actions">
            <Link className="button button-cta" to="/signup">
              Get Started
            </Link>
            <button className="button button-secondary" type="button" onClick={() => navigate('/dashboard')}>
              Scan Now
            </button>
          </div>
          <div className="hero-trust-row">
            <span>Secure token auth</span>
            <span>Clean Hindi guidance</span>
            <span>Field-ready analytics</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card glass-panel">
            <div className="visual-chip">Verified</div>
            <h2>Strip scan in seconds</h2>
            <p>Instantly identify safe and suspicious medicine batches.</p>
            <div className="visual-keypoints">
              <span>OCR-powered</span>
              <span>AI-backed</span>
              <span>Heatmap analytics</span>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        <article className="feature-card glass-panel neon-glow">
          <h3>Live strip OCR</h3>
          <p>Capture packaging text and reveal medicine authenticity immediately.</p>
        </article>
        <article className="feature-card glass-panel neon-glow">
          <h3>Interaction checks</h3>
          <p>Review combinations for risky drug interactions with a trusted AI summary.</p>
        </article>
        <article className="feature-card glass-panel neon-glow">
          <h3>Counterfeit heatmap</h3>
          <p>Spot flagged regions and make safer buy decisions in real time.</p>
        </article>
      </section>

      <section className="cta-panel glass-panel">
        <div>
          <h2>A premium experience for every patient and health worker.</h2>
          <p>Modern dark mode, tactile glass surfaces, and animated gradients for a more confident verification flow.</p>
        </div>
        <div className="cta-actions">
          <Link className="button button-cta" to="/login">
            Log in
          </Link>
          <Link className="button button-secondary" to="/signup">
            Create account
          </Link>
        </div>
      </section>
    </main>
  )
}
