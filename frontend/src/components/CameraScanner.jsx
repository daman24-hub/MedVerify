import { useEffect, useRef, useState } from 'react'
import { verifyMedicineByImage, verifyMedicineByName } from '../services/api'
import Tesseract from 'tesseract.js'

function CameraScanner({ onScanComplete, loading }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [scannerError, setScannerError] = useState('')
  const [cameraError, setCameraError] = useState(null)
  const [stream, setStream] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  const parseMedicineName = (rawText) => {
    if (!rawText) return null

    const lines = rawText
      .split('\n')
      .map((l) => l.replace(/[®™©\(\)\[\]]/g, '').trim())
      .filter((l) => l.length >= 4)

    // Priority 1: line with known medicine keywords
    const medKeywords = /\b(tablet|capsule|syrup|injection|suspension|mg|ml|paracetamol|amoxicillin|ibuprofen|cetirizine|azithromycin|calpol|dolo|crocin|combiflam|metformin|atorvastatin|omeprazole|pantoprazole|aspirin|ciprofloxacin|metronidazole)\b/i
    const keywordMatch = lines.find(l => medKeywords.test(l))
    if (keywordMatch) {
      return keywordMatch.replace(/[^a-zA-Z\s]/g, ' ').trim().split(/\s+/).slice(0, 3).join(' ')
    }

    // Priority 2: longest clean alphabetic line
    const nameOnly = lines
      .filter(l => /^[A-Za-z][A-Za-z\s\-]{3,}$/.test(l))
      .sort((a, b) => b.length - a.length)[0]
    if (nameOnly) return nameOnly.trim()

    // Priority 3: first line with 4+ letters
    const fallback = lines.find(l => (l.match(/[A-Za-z]/g) || []).length >= 4)
    return fallback?.replace(/[^a-zA-Z\s]/g, ' ').trim() || null
  }

  const performLocalOcrFallback = async (base64Image) => {
    try {
      console.log('Starting local Tesseract OCR fallback...')
      setOcrProgress(40)
      const result = await Tesseract.recognize(base64Image, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(40 + m.progress * 50))
          }
        },
      })

      const rawText = result?.data?.text || ''
      console.log('Tesseract OCR extracted text:', rawText)

      const candidateName = parseMedicineName(rawText)
      console.log('Parsed candidate medicine name:', candidateName)

      if (!candidateName) {
        throw new Error('Could not recognize any medicine name from the image.')
      }

      setOcrProgress(90)
      const response = await verifyMedicineByName(candidateName)
      const data = response?.data || response
      setOcrProgress(100)

      if (data?.success && data?.medicine?.name) {
        onScanComplete(data.medicine.name, rawText, null)
        return true
      } else {
        onScanComplete(candidateName, rawText, null)
        return true
      }
    } catch (fallbackError) {
      console.error('Local Tesseract fallback failed:', fallbackError)
      setOcrProgress(0)
      setScannerError(
        `OCR failed: ${fallbackError?.message || 'Could not verify medicine. Try entering the name manually.'}`
      )
      return false
    }
  }

  const startCamera = async () => {
    try {
      setScannerError('')
      setCameraError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied. Please allow camera permission in your browser settings and reload.')
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found on this device. Please upload an image instead.')
      } else {
        setCameraError(`Camera error: ${err.message}`)
      }
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStream(null)
    setCameraActive(false)
  }

  const scan = async () => {
    if (!videoRef.current || !canvasRef.current) return

    let base64Image = null

    try {
      setScannerError('')
      setOcrProgress(10)
      const video = videoRef.current
      const canvas = canvasRef.current
      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(video, 0, 0, width, height)

      base64Image = canvas.toDataURL('image/jpeg')
      setOcrProgress(30)

      const response = await verifyMedicineByImage(base64Image)
      const data = response?.data || response
      setOcrProgress(100)

      if (data?.success && data?.medicine?.name) {
        onScanComplete(data.medicine.name, data.medicine.name, data)
      } else {
        setScannerError('Could not identify medicine from backend. Trying local OCR...')
        await performLocalOcrFallback(base64Image)
      }
    } catch (error) {
      console.warn('Backend image OCR failed, trying local fallback:', error.message)
      if (base64Image) {
        await performLocalOcrFallback(base64Image)
      } else {
        setScannerError('Failed to capture image from camera. Please try again.')
        setOcrProgress(0)
      }
    }
  }

  const processUploadedFile = async (file) => {
    setScannerError('')
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setScannerError('Please upload an image file (PNG, JPG, etc.).')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Image = reader.result
      setOcrProgress(30)
      try {
        const response = await verifyMedicineByImage(base64Image)
        const data = response?.data || response
        setOcrProgress(100)

        if (data?.success && data?.medicine?.name) {
          onScanComplete(data.medicine.name, data.medicine.name, data)
        } else {
          console.warn('Backend OCR did not find medicine, trying local fallback...')
          await performLocalOcrFallback(base64Image)
        }
      } catch (error) {
        console.warn('Backend image OCR failed, trying local fallback:', error.message)
        await performLocalOcrFallback(base64Image)
      }
    }
    reader.onerror = () => {
      setScannerError('Failed to read image file.')
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await processUploadedFile(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!cameraActive) setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (cameraActive) return
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    await processUploadedFile(file)
  }

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  return (
    <section className="panel camera-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Scan medicine</p>
          <h2>Capture the strip clearly</h2>
        </div>
        <span className="live-pill">Live OCR</span>
      </div>
      <p className="hint-text">
        Place the strip on a flat surface and align it inside the guide frame or upload an image.
      </p>

      <div
        className={`camera-stage ${isDragging ? 'camera-stage--dragging' : ''} ${!cameraActive ? 'camera-stage--clickable' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!cameraActive && fileInputRef.current) {
            fileInputRef.current.click()
          }
        }}
        style={{ cursor: !cameraActive ? 'pointer' : 'default' }}
      >
        {!cameraActive ? (
          <div className="camera-placeholder">
            <div className="camera-placeholder-icon">{cameraError ? '⚠️' : '📷'}</div>
            <p>{cameraError ? 'Camera offline' : 'Drag & Drop strip image'}</p>
            <span>
              {cameraError
                ? `${cameraError} Click here to browse instead.`
                : 'Or click anywhere inside this box to browse files. Supports PNG, JPG.'}
            </span>
          </div>
        ) : null}

        <video ref={videoRef} muted playsInline className="camera-feed" />

        {cameraActive && (
          <div className="scan-frame" aria-hidden="true">
            <span className="frame-corner corner-top-left" />
            <span className="frame-corner corner-top-right" />
            <span className="frame-corner corner-bottom-left" />
            <span className="frame-corner corner-bottom-right" />
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      <canvas ref={canvasRef} className="hidden-canvas" aria-hidden="true" />

      <div className="action-row">
        {!cameraActive ? (
          <button onClick={startCamera} className="button primary" type="button">
            Start Camera
          </button>
        ) : (
          <button onClick={stopCamera} className="button ghost" type="button">
            Stop Camera
          </button>
        )}

        <button
          onClick={scan}
          className="button success"
          type="button"
          disabled={!cameraActive || loading}
        >
          {loading ? 'Scanning...' : 'Capture + OCR'}
        </button>
      </div>

      {ocrProgress > 0 && ocrProgress < 100 ? (
        <div className="progress-shell">
          <div className="progress-bar" style={{ width: `${ocrProgress}%` }} />
          <p className="subtle">Reading label text: {ocrProgress}%</p>
        </div>
      ) : null}

      <ul className="tip-list">
        <li>Place medicine on a dark or plain background</li>
        <li>Avoid glare on foil packs</li>
        <li>Capture batch, expiry, and brand name together</li>
      </ul>

      {scannerError ? <p className="error-text">{scannerError}</p> : null}
    </section>
  )
}

export default CameraScanner