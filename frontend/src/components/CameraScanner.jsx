import { useEffect, useRef, useState } from 'react'
import { verifyMedicineByImage, verifyMedicineByName } from '../services/api'
import Tesseract from 'tesseract.js'

function CameraScanner({ onScanComplete, loading }) {
	const videoRef = useRef(null)
	const canvasRef = useRef(null)
	const [cameraActive, setCameraActive] = useState(false)
	const [ocrProgress, setOcrProgress] = useState(0)
	const [scannerError, setScannerError] = useState('')
	const [cameraError, setCameraError] = useState(null) // FIXED: camera error state
	const [stream, setStream] = useState(null) // FIXED: camera stream state
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef(null)

	const parseMedicineName = (rawText) => {
		if (!rawText) return null;
		
		// Clean up lines (remove registered trademark symbols) and filter by length
		const lines = rawText
			.split('\n')
			.map(l => l.replace(/[®™]/g, '').trim())
			.filter(l => l.length >= 3);

		// Strategy 1: Find a line starting with a letter, allowing letters, digits, spaces, hyphens, slashes, or parentheses (e.g., Calpol 500, Paracetamol 650mg)
		const namePattern = /^[A-Za-z][A-Za-z0-9\s\-\/\(\)\.,]{2,49}$/;
		const candidate = lines.find(line => namePattern.test(line));
		if (candidate) return candidate.trim();

		// Strategy 2: Fallback — find the longest line containing at least one letter
		const fallback = lines
			.filter(l => /[A-Za-z]/.test(l))
			.sort((a, b) => b.length - a.length)[0];

		return fallback?.trim() || null;
	};

	const performLocalOcrFallback = async (base64Image) => {
		try {
			console.log('Starting local Tesseract OCR fallback...');
			setOcrProgress(40);
			const result = await Tesseract.recognize(
				base64Image,
				'eng',
				{
					logger: m => {
						if (m.status === 'recognizing text') {
							setOcrProgress(Math.round(40 + m.progress * 50));
						}
					}
				}
			);
			
			const rawText = result?.data?.text || '';
			console.log('Tesseract OCR extracted text:', rawText);
			
			const candidateName = parseMedicineName(rawText);
			console.log('Parsed candidate medicine name:', candidateName);
			
			if (!candidateName) {
				throw new Error('Could not recognize any medicine name from the image.');
			}
			
			setOcrProgress(95);
			const response = await verifyMedicineByName(candidateName);
			setOcrProgress(100);
			
			if (response?.success && response?.medicine?.name) {
				onScanComplete(response.medicine.name, rawText, null);
				return true;
			} else {
				throw new Error('Medicine not found in database.');
			}
		} catch (fallbackError) {
			console.error('Local Tesseract fallback failed:', fallbackError);
			setOcrProgress(0);
			setScannerError(`OCR failed: ${fallbackError.message || 'Could not verify medicine. Try entering the name manually.'}`);
			return false;
		}
	};

	const startCamera = async () => {
		try {
			setScannerError('')
			setCameraError(null) // FIXED: clear previous error
			const mediaStream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: 'environment' } // FIXED: prefer rear camera on mobile
			})
			setStream(mediaStream) // FIXED: save stream
			if (videoRef.current) {
				videoRef.current.srcObject = mediaStream // FIXED: attach stream
				await videoRef.current.play()
			}
			setCameraActive(true)
		} catch (err) {
			// FIXED: handle all permission/device error cases
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
			stream.getTracks().forEach((track) => track.stop()) // FIXED: prevent memory leak
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null
		}
		setStream(null)
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

			const base64Image = canvas.toDataURL('image/jpeg')
			setOcrProgress(30)

			const response = await verifyMedicineByImage(base64Image)
			setOcrProgress(100)

			if (response?.success && response?.medicine?.name) {
				onScanComplete(response.medicine.name, response.medicine.name, response)
			} else {
				setScannerError('Could not identify medicine name from image. Please try again with better lighting.')
			}
		} catch (error) {
			console.warn('Backend image OCR failed, trying local fallback:', error.message);
			const success = await performLocalOcrFallback(base64Image);
			if (!success) {
				setOcrProgress(0);
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
				setOcrProgress(100)
				if (response?.success && response?.medicine?.name) {
					onScanComplete(response.medicine.name, response.medicine.name, response)
				} else {
					setScannerError('Could not read medicine name from image. Please try again with better lighting.')
				}
			} catch (error) {
				console.warn('Backend image OCR failed, trying local fallback:', error.message);
				const success = await performLocalOcrFallback(base64Image);
				if (!success) {
					setOcrProgress(0);
				}
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
		e.preventDefault();
		e.stopPropagation();
		if (!cameraActive) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		if (cameraActive) return;

		const file = e.dataTransfer.files?.[0];
		if (!file) return;
		await processUploadedFile(file);
	};

	useEffect(() => {
		return () => {
			if (stream) stream.getTracks().forEach(track => track.stop()); // FIXED: prevent memory leak
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
						fileInputRef.current.click();
					}
				}}
				style={{ cursor: !cameraActive ? 'pointer' : 'default' }}
			>
				{!cameraActive ? (
					<div className="camera-placeholder">
						<div className="camera-placeholder-icon">
							{cameraError ? '⚠️' : '📷'}
						</div>
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
