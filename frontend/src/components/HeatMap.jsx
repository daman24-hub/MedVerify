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
		count: Number(entry.flaggedCount ?? entry.count ?? 0),
		district: entry.district || 'Unknown district',
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
				// FIXED: parse fetch response directly without response.data
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

	const totalFlags = useMemo(
		() => points.reduce((acc, point) => acc + point.count, 0),
		[points],
	)

	return (
		<section className="panel map-shell">
			<div className="panel-heading">
				<div>
					<p className="section-kicker">Field intelligence</p>
					<h2>Counterfeit Heatmap</h2>
				</div>
				<span className="mini-badge">7 days</span>
			</div>
			<p className="hint-text">Red circles indicate districts with higher flagged reports.</p>
			<div className="map-wrap">
				<MapContainer center={[20.5937, 78.9629]} zoom={5} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
					<TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
					{points.map((point, index) => (
						<CircleMarker
							key={`${point.lat}-${point.lng}-${index}`}
							center={[point.lat, point.lng]}
							radius={Math.min(point.count * 3 + 4, 30)}
							pathOptions={{
								color: point.count > 5 ? '#A32D2D' : '#0F6E56',
								fillColor: point.count > 5 ? '#d34747' : '#0F6E56',
								fillOpacity: 0.35,
								weight: 2,
							}}
						>
							<Popup>
								{point.district}: {point.count} flagged scan(s)
							</Popup>
						</CircleMarker>
					))}
				</MapContainer>
			</div>

			<div className="legend">
				<span className="low">Low flag density</span>
				<span className="high">High flag density</span>
			</div>
			<p className="heatmap-meta">Total flagged records in view: {totalFlags}</p>
			{error ? <p className="error-text">{error}</p> : null}
		</section>
	)
}
