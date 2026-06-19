import { useMemo, useState, useEffect } from 'react'
import CameraScanner from '../components/CameraScanner'
import ResultCard from '../components/ResultCard'
import InteractionBox from '../components/InteractionBox'
import HeatMap from '../components/HeatMap'
import { logScan, verifyMedicine } from '../services/api'
import { showToast } from '../services/toast'

const STREAK_KEY = 'dawacheck_scan_days'

function getStreakFromStorage() {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    const days = raw ? JSON.parse(raw) : []
    if (!Array.isArray(days)) return 0

    const today = new Date()
    let count = 0
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (days.includes(key)) {
        count += 1
      } else {
        break
      }
    }

    return count
  } catch {
    return 0
  }
}

function recordScanDay() {
  try {
    const todayKey = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem(STREAK_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const deduped = Array.from(new Set([...(Array.isArray(existing) ? existing : []), todayKey]))
    localStorage.setItem('dawacheck_scan_days', JSON.stringify(deduped.slice(-45)))
  } catch {
    // Ignore streak storage failures.
  }
}

function inferMedicineName(ocrText) {
  if (!ocrText) return ''
  const normalized = ocrText.replace(/\s+/g, ' ').trim()
  const match = normalized.match(/[A-Za-z][A-Za-z0-9\- ]{2,40}/)
  return (match?.[0] || normalized.split(' ').slice(0, 3).join(' ')).trim()
}

function makeDummyResult(ocrText, medicineName) {
  return {
    medicine: medicineName || 'Paracetamol 650',
    status: 'genuine',
    ocrText,
    price: 34,
    marketAverage: 41,
    advice: 'Store below 25C and verify batch number before purchase.',
    hindiText: 'Dawa asli lag rahi hai. Kripya expiry date zarur dekhein.',
  }
}

export default function DashboardPage() {
  const [scanResult, setScanResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanStreak, setScanStreak] = useState(0)

  const hasResult = useMemo(() => Boolean(scanResult), [scanResult])

  useEffect(() => {
    setScanStreak(getStreakFromStorage())
  }, [])

  const handleScanComplete = async (ocrText) => {
    const medicineName = inferMedicineName(ocrText)
    setLoading(true)
    setError('')

    try {
      const response = await verifyMedicine(medicineName)
      const payload = response?.data || {}
      const normalized = {
        medicine: payload.medicine || payload.name || medicineName,
        status: payload.status || 'not_found',
        ocrText,
        price: payload.price,
        marketAverage: payload.marketAverage,
        advice: payload.advice || payload.message,
        hindiText: payload.hindiText || payload.hindi_message,
      }
      setScanResult(normalized)
      recordScanDay()
      setScanStreak(getStreakFromStorage())

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords
            try {
              await logScan(latitude, longitude, normalized.medicine, normalized.status)
            } catch {
              // Non-blocking analytics call.
            }
          },
          () => {
            // skip location if denied
          },
          { enableHighAccuracy: false, timeout: 7000 },
        )
      }
    } catch (apiError) {
      setError('Server unavailable. Displaying demo scan result.')
      setScanResult(makeDummyResult(ocrText, medicineName))
      recordScanDay()
      setScanStreak(getStreakFromStorage())
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setScanResult(null)
    setError('')
  }

  const primaryMedicine = scanResult?.medicine || 'No medicine scanned yet'
  const quickStatus = scanResult?.status || 'ready'

  return (
    <main className="page-shell dashboard-page">
      <section className="dashboard-overview glass-panel">
        <div className="overview-copy">
          <p className="eyebrow">Dashboard</p>
          <h1>Live scan analytics</h1>
          <p>Access your latest scans, risk checks, and counterfeit insights from one premium console.</p>
        </div>
        <div className="overview-stats">
          <div className="stat-card neon-card">
            <span>Scan streak</span>
            <strong>{scanStreak}</strong>
          </div>
          <div className="stat-card neon-card">
            <span>Latest result</span>
            <strong>{primaryMedicine}</strong>
          </div>
          <div className="stat-card neon-card status">
            <span>Current status</span>
            <strong>{quickStatus}</strong>
          </div>
        </div>
      </section>

      {error ? <div className="alert-panel glass-panel alert-error">{error}</div> : null}

      <section className="dashboard-grid">
        <div className="dashboard-panel camera-panel glass-panel">
          <CameraScanner onScanComplete={handleScanComplete} loading={loading} />
        </div>
        <div className="dashboard-panel right-column">
          <div className="panel-wrapper glass-panel">
            <ResultCard result={scanResult} onReset={resetFlow} />
          </div>
          <div className="panel-wrapper glass-panel">
            <InteractionBox />
          </div>
          <div className="panel-wrapper glass-panel">
            <div className="heatmap-protect w-full" style={{ minHeight: 350, overflow: 'hidden' }}>
              <HeatMap />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
