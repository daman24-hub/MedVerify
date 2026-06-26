import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { getHeatmapData } from '../services/api'
import 'leaflet/dist/leaflet.css'; // FIXED: without this, tiles render but controls are broken

function normalizePoints(payload) {
	if (Array.isArray(payload)) return payload
	if (Array.isArray(payload?.points)) return payload.points
	return []
}

function normalizeEntry(entry) {
	return {
		lat: Number(entry.lat ?? entry.latitude ?? 20.5937),
		lng: Number(entry.lng ?? entry.longitude ?? 78.9629),
		name: entry.name || 'Unknown Medicine',
		status: entry.status || 'suspect',
		district: entry.district || 'Unknown Location'
	}
}

export default function HeatMap() {
	const [points, setPoints] = useState([])
	const [error, setError] = useState('')

	useEffect(() => {
		let cancelled = false

		getHeatmapData()
			.then((response) => {
				if (cancelled) return
				// FIXED: parse fetch response directly
				const list = normalizePoints(response).map(normalizeEntry)
				setPoints(list)
				setError('')
			})
			.catch(() => {
				if (cancelled) return
				setError('Heatmap is unavailable right now.')
			})

		return () => {
			cancelled = true
		}
	}, [])

	const stats = useMemo(() => {
		let critical = 0
		let medium = 0
		let low = 0
		points.forEach((p) => {
			if (p.status === 'counterfeit') critical += 1
			else if (p.status === 'suspect') medium += 1
			else if (p.status === 'genuine') low += 1
		})
		return { critical, medium, low, total: points.length }
	}, [points])

	return (
		<section className="panel map-shell">
			<div className="panel-heading">
				<div>
					<p className="section-kicker">Field intelligence</p>
					<h2>Medicine Usage & Safety Heatmap</h2>
				</div>
				<span className="mini-badge">7 days</span>
			</div>
			<p className="hint-text">
				Green, orange, and red circles indicate low, medium, and critical safety risks in each region.
			</p>
			<div className="map-wrap">
				<MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
					<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
					{points.map((point, index) => {
						let color = '#198754' // Low / Genuine
						let fillColor = '#198754'
						let radius = 6
						let riskLabel = 'Low Risk (Genuine)'

						if (point.status === 'counterfeit') {
							color = '#dc3545' // Critical / Counterfeit
							fillColor = '#dc3545'
							radius = 14
							riskLabel = 'Critical Risk (Counterfeit)'
						} else if (point.status === 'suspect') {
							color = '#fd7e14' // Medium / Suspect
							fillColor = '#fd7e14'
							radius = 10
							riskLabel = 'Medium Risk (Suspect)'
						}

						return (
							<CircleMarker
								key={`${point.lat}-${point.lng}-${index}`}
								center={[point.lat, point.lng]}
								radius={radius}
								pathOptions={{
									color: color,
									fillColor: fillColor,
									fillOpacity: 0.4,
									weight: 2,
								}}
							>
								<Popup>
									<div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
										<strong style={{ fontSize: '1rem', display: 'block', marginBottom: '4px' }}>{point.name}</strong>
										<div>Location: {point.district}</div>
										<div>Risk: <span style={{ color: color, fontWeight: 'bold' }}>{riskLabel}</span></div>
									</div>
								</Popup>
							</CircleMarker>
						)
					})}
				</MapContainer>
			</div>

			<div className="legend" style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
					<span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#198754' }} />
					<span>Low Risk ({stats.low})</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
					<span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fd7e14' }} />
					<span>Medium Risk ({stats.medium})</span>
				</div>
				<div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
					<span style={{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#dc3545' }} />
					<span>Critical Risk ({stats.critical})</span>
				</div>
			</div>
			<p className="heatmap-meta" style={{ marginTop: '0.5rem' }}>Total scanned records in view: {stats.total}</p>
			{error ? <p className="error-text">{error}</p> : null}
		</section>
	)
}
