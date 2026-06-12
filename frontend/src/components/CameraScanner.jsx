import { useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'

function CameraScanner({ onScanComplete, loading }) {
	const videoRef = useRef(null)
	const canvasRef = useRef(null)
	const [cameraActive, setCameraActive] = useState(false)
	const [ocrProgress, setOcrProgress] = useState(0)
	const [scannerError, setScannerError] = useState('')

	const startCamera = async () => {
		try {
			setScannerError('')
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: { ideal: 'environment' } },
				audio: false,
			})

			if (videoRef.current) {
				videoRef.current.srcObject = stream
				await videoRef.current.play()
			}

			setCameraActive(true)
		} catch (error) {
			setScannerError('Could not access camera. Check permissions and retry.')
			setCameraActive(false)
		}
	}

	const stopCamera = () => {
		if (!videoRef.current || !videoRef.current.srcObject) return
		const tracks = videoRef.current.srcObject.getTracks()
		tracks.forEach((track) => track.stop())
		videoRef.current.srcObject = null
		setCameraActive(false)
	}

	const scan = async () => {
		if (!videoRef.current || !canvasRef.current) return

		try {
			setScannerError('')
			const video = videoRef.current
			const canvas = canvasRef.current
			const width = video.videoWidth || 1280
			const height = video.videoHeight || 720

			canvas.width = width
			canvas.height = height

			const context = canvas.getContext('2d', { willReadFrequently: true })
			context.drawImage(video, 0, 0, width, height)

			const {
				data: { text },
			} = await Tesseract.recognize(canvas, 'eng', {
				logger: (message) => {
					if (message.status === 'recognizing text' && message.progress) {
						setOcrProgress(Math.round(message.progress * 100))
					}
				},
			})

			const cleaned = text.replace(/\s+/g, ' ').trim()
			onScanComplete(cleaned)
		} catch (error) {
			setScannerError('OCR failed. Try better lighting and hold camera steady.')
		}
	}

	useEffect(() => {
		return () => {
			stopCamera()
		}
	}, [])

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
				Place the strip on a flat surface and align it inside the guide frame.
			</p>

			<div className="camera-stage">
				{!cameraActive ? (
					<div className="camera-placeholder">
						<div className="camera-placeholder-icon">[]</div>
						<p>Back camera preview appears here</p>
						<span>Best results come from bright light and sharp focus.</span>
					</div>
				) : null}
				<video ref={videoRef} muted playsInline className="camera-feed" />
				<div className="scan-frame" aria-hidden="true">
					<span className="frame-corner corner-top-left" />
					<span className="frame-corner corner-top-right" />
					<span className="frame-corner corner-bottom-left" />
					<span className="frame-corner corner-bottom-right" />
				</div>
			</div>

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
