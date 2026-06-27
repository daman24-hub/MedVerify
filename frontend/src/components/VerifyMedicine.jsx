import { useState, useRef } from 'react'
import Tesseract from 'tesseract.js'
import { verifyMedicineByImage } from '../services/api'
import VerifyResult from './VerifyResult'
import './VerifyMedicine.css'

export default function VerifyMedicine() {
  const [searchedName, setSearchedName] = useState(null)
  const [typedName, setTypedName] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [stream, setStream] = useState(null)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [ocrError, setOcrError] = useState('')

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  const parseMedicineName = (rawText) => {
    if (!rawText) return null
    const lines = rawText
      .split('\n')
      .map(l => l.replace(/[®™©\(\)\[\]]/g, '').trim())
      .filter(l => l.length >= 4)

    const medKeywords = /\b(tablet|capsule|syrup|injection|suspension|mg|ml|paracetamol|amoxicillin|ibuprofen|cetirizine|azithromycin|calpol|dolo|crocin|combiflam|metformin|atorvastatin|omeprazole|pantoprazole|aspirin|ciprofloxacin|metronidazole)\b/i
    const keywordMatch = lines.find(l => medKeywords.test(l))
    if (keywordMatch) return keywordMatch.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ')

    const nameOnly = lines.filter(l => /^[A-Za-z][A-Za-z\s\-]{3,}$/.test(l)).sort((a, b) => b.length - a.length)[0]
    if (nameOnly) return nameOnly.trim()

    const fallback = lines.find(l => (l.match(/[A-Za-z]/g) || []).length >= 4)
    return fallback?.replace(/[^a-zA-Z\s]/g, ' ').trim() || null
  }

  const runOcr = async (base64Image) => {
    setScanning(true)
    setOcrError('')
    setOcrProgress(10)
    try {
      const response = await verifyMedicineByImage(base64Image)
      const data = response?.data || response
      if (data?.success && data?.medicine?.name) {
        setOcrProgress(100)
        setSearchedName(data.medicine.name)
        setScanning(false)
        return
      }
    } catch (e) {
      const errMsg = e.response?.data?.error
      if (errMsg === 'Please scan a valid medicine.') {
        setOcrError(errMsg)
        setOcrProgress(0)
        setScanning(false)
        return
      }
      console.warn('Backend OCR failed, using Tesseract fallback')
    }

    try {
      setOcrProgress(30)
      const result = await Tesseract.recognize(base64Image, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(30 + m.progress * 60))
          }
        }
      })
      const rawText = result?.data?.text || ''
      const name = parseMedicineName(rawText)
      if (name) {
        setOcrProgress(100)
        setSearchedName(name)
      } else {
        setOcrError('Could not read medicine name. Try a clearer image.')
        setOcrProgress(0)
      }
    } catch (e) {
      setOcrError('OCR failed. Please type the medicine name instead.')
      setOcrProgress(0)
    } finally {
      setScanning(false)
    }
  }

  const startCamera = async () => {
    try {
      setOcrError('')
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        // autoPlay attribute handles playback — no manual .play() needed
      }
      setCameraActive(true)
    } catch (err) {
      setOcrError('Camera access denied. Please upload an image instead.')
    }
  }

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    setStream(null)
    setCameraActive(false)
  }

  const captureAndOcr = async () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d', { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg')
    stopCamera()
    await runOcr(base64)
  }

  const processFile = async (file) => {
    if (!file?.type.startsWith('image/')) {
      setOcrError('Please upload an image file.')
      return
    }
    const reader = new FileReader()
    reader.onloadend = async () => {
      setUploadedImage(reader.result)
      await runOcr(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (typedName.trim()) setSearchedName(typedName.trim())
  }

  const reset = () => {
    setSearchedName(null)
    setTypedName('')
    setUploadedImage(null)
    setOcrProgress(0)
    setOcrError('')
    stopCamera()
  }

  if (searchedName) return (
    <div className="vm-page">
      <div className="vm-hero">
        <p className="vm-kicker">VERIFY MEDICINE</p>
        <h1 className="vm-title">Verify your medicine in seconds</h1>
        <p className="vm-sub">Upload or capture your medicine strip to extract details using OCR and check its authenticity instantly.</p>
      </div>
      <VerifyResult medicineName={searchedName} onReset={reset} />
      <button type="button" className="vm-rescan-btn" onClick={reset}>
        Scan another medicine
      </button>
    </div>
  )

  return (
    <div className="vm-page">
      <div className="vm-hero">
        <p className="vm-kicker">VERIFY MEDICINE</p>
        <h1 className="vm-title">Verify your medicine in seconds</h1>
        <p className="vm-sub">Upload or capture your medicine strip to extract details using OCR and check its authenticity instantly.</p>
      </div>

      <div className="vm-grid">
        {/* Left panel — manual + upload */}
        <div className="vm-panel">
          <div className="vm-panel-header">
            <span className="vm-step-badge">1</span>
            <div>
              <p className="vm-panel-title">Medicine Details</p>
              <p className="vm-panel-sub">Enter the medicine name manually or extract it from the strip.</p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="vm-search-form">
            <div className="vm-input-wrap">
              <svg className="vm-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                className="vm-input"
                placeholder="Type medicine name (e.g. Dolo 650, Calpol, Amoxicillin)"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
              />
            </div>
            <p className="vm-input-tip">Tip: You can also extract the name using OCR.</p>
          </form>

          <div className="vm-or-row"><span>OR</span></div>

          <div
            className={`vm-upload-zone ${dragOver ? 'vm-upload-zone--active' : ''} ${uploadedImage ? 'vm-upload-zone--has-image' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]) }}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadedImage ? (
              <img src={uploadedImage} alt="Uploaded strip" className="vm-uploaded-preview" />
            ) : (
              <>
                <div className="vm-upload-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p className="vm-upload-title">Upload Medicine Strip Image</p>
                <p className="vm-upload-sub">Drag & drop your image here or click to browse</p>
                <p className="vm-upload-hint">Supports PNG, JPG, JPEG • Max size 5MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => processFile(e.target.files[0])}
          />

          {ocrProgress > 0 && ocrProgress < 100 && (
            <div className="vm-progress">
              <div className="vm-progress-bar" style={{ width: `${ocrProgress}%` }} />
              <p className="vm-progress-label">Extracting text... {ocrProgress}%</p>
            </div>
          )}

          {ocrError && <p className="vm-error">{ocrError}</p>}

          <button
            type="button"
            className="vm-extract-btn"
            onClick={handleSearch}
            disabled={scanning || !typedName.trim()}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vm-btn-icon">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            {scanning ? 'Extracting...' : 'Extract Text (OCR)'}
          </button>
        </div>

        {/* Right panel — camera */}
        <div className="vm-panel">
          <div className="vm-panel-header">
            <span className="vm-step-badge">2</span>
            <div>
              <p className="vm-panel-title">Scan Medicine Strip</p>
              <p className="vm-panel-sub">Place the strip on a flat surface and align it inside the frame</p>
            </div>
            <span className="vm-live-badge">● Live OCR</span>
          </div>

          <div
            className="vm-camera-stage"
            onClick={() => { if (!cameraActive) startCamera() }}
          >
            {/* Video always rendered so ref is available */}
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="vm-video"
              style={{ display: cameraActive ? 'block' : 'none' }}
            />

            {cameraActive && (
              <div className="vm-scan-frame">
                <span className="vm-corner vm-corner--tl" />
                <span className="vm-corner vm-corner--tr" />
                <span className="vm-corner vm-corner--bl" />
                <span className="vm-corner vm-corner--br" />
              </div>
            )}

            {!cameraActive && (
              <div className="vm-camera-idle">
                <div className="vm-camera-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </div>
                <p className="vm-camera-idle-title">Drag & drop strip image</p>
                <p className="vm-camera-idle-sub">or click anywhere to open camera</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="vm-camera-badges">
            <span className="vm-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vm-badge-icon">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              High Accuracy OCR
            </span>
            <span className="vm-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vm-badge-icon">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Fast & Secure
            </span>
            <span className="vm-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vm-badge-icon">
                <path d="M1 6l11 7L23 6"/><path d="M1 6v12a2 2 0 002 2h18a2 2 0 002-2V6"/>
              </svg>
              Works Offline
            </span>
          </div>

          <div className="vm-camera-actions">
            {!cameraActive ? (
              <button className="vm-btn-outline" onClick={startCamera} type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vm-btn-icon">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Start Camera
              </button>
            ) : (
              <button className="vm-btn-outline" onClick={stopCamera} type="button">
                Stop Camera
              </button>
            )}
            <button
              className="vm-btn-primary"
              onClick={captureAndOcr}
              disabled={!cameraActive || scanning}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="vm-btn-icon">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              {scanning ? 'Processing...' : 'Capture + OCR'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom feature strip */}
      <div className="vm-features">
        <div className="vm-feature">
          <div className="vm-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <p className="vm-feature-title">Accurate & Reliable</p>
            <p className="vm-feature-sub">Advanced OCR for high accuracy</p>
          </div>
        </div>
        <div className="vm-feature">
          <div className="vm-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <p className="vm-feature-title">Your Data is Safe</p>
            <p className="vm-feature-sub">Images are processed securely</p>
          </div>
        </div>
        <div className="vm-feature">
          <div className="vm-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div>
            <p className="vm-feature-title">Instant Results</p>
            <p className="vm-feature-sub">Get results in just a few seconds</p>
          </div>
        </div>
      </div>
    </div>
  )
}