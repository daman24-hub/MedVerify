import Drug from '../models/Drug.js'
import ScanLog from '../models/ScanLog.js'
import { translateToHindi } from '../services/geminiService.js'

const normalizeStatus = (approvalStatus) => {
	const value = String(approvalStatus || '').toLowerCase()
	if (value.includes('approved') || value.includes('genuine')) return 'genuine'
	if (value.includes('expired')) return 'expired'
	if (value.includes('flag') || value.includes('warning')) return 'flagged'
	return 'flagged'
}

const buildEnglishSummary = (drug) => {
	const status = normalizeStatus(drug.approvalStatus)
	return [
		`Medicine ${drug.name} is marked as ${status}.`,
		`Generic alternative ${drug.genericName || 'not available'} may cost around Rs. ${Number(drug.genericPrice || 0).toFixed(2)} while brand is Rs. ${Number(drug.brandPrice || 0).toFixed(2)}.`,
	].join(' ')
}

export const verifyMedicine = async (req, res, next) => {
	try {
		const rawName = String(req.query.name || '').trim()
		if (!rawName) {
			return res.status(400).json({ error: 'Query param name is required.' })
		}

		// Create case-insensitive regex for flexible matching
		const searchRegex = new RegExp(rawName, 'i')

		// Multi-field fuzzy search across name, genericName, and manufacturer
		let drug = await Drug.findOne({
			$or: [
				{ name: { $regex: searchRegex } },
				{ genericName: { $regex: searchRegex } },
				{ manufacturer: { $regex: searchRegex } },
			],
		}).lean()

		if (!drug) {
			// Token-based keyword fallback search
			const cleanWords = rawName
				.toLowerCase()
				.split(/[\s\-\/\(\)\.,]+/)
				.filter(w => w.length >= 3)
				.filter(w => !['tablets', 'tablet', 'capsules', 'capsule', 'suspension', 'syrup', 'injection', 'ip', 'usp', 'bp', 'mg', 'mcg', 'ml', 'rx'].includes(w));

			if (cleanWords.length > 0) {
				console.log(`[VERIFY] No direct match for "${rawName}". Trying keyword fallback for:`, cleanWords);
				// Search for a drug that contains any of the clean keywords
				// We prioritize exact word match first
				for (const word of cleanWords) {
					const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
					const fallbackDrug = await Drug.findOne({
						$or: [
							{ name: { $regex: wordRegex } },
							{ genericName: { $regex: wordRegex } }
						]
					}).lean();
					if (fallbackDrug) {
						drug = fallbackDrug;
						break;
					}
				}

				// If word boundary match fails, try a simple substring match for the keyword
				if (!drug) {
					for (const word of cleanWords) {
						const wordRegex = new RegExp(word, 'i');
						const fallbackDrug = await Drug.findOne({
							$or: [
								{ name: { $regex: wordRegex } },
								{ genericName: { $regex: wordRegex } }
							]
						}).lean();
						if (fallbackDrug) {
							drug = fallbackDrug;
							break;
						}
					}
				}
			}
		}

		if (!drug) {
			console.log(`[VERIFY] No match found for: "${rawName}"`)
			// FIXED: Return exactly the required response shape when drug is not found
			return res.status(200).json({
				success: true,
				medicine: {
					name: rawName,
					manufacturer: 'Unknown',
					isGenuine: false,
					status: 'suspect',
					price: 0,
					genericAlternatives: []
				}
			})
		}

		console.log(`[VERIFY] Match found: "${rawName}" -> "${drug.name}"`)

		const dbStatus = normalizeStatus(drug.approvalStatus)
		const responseStatus = dbStatus === 'genuine' ? 'genuine' : (dbStatus === 'expired' ? 'counterfeit' : 'suspect')

		// FIXED: Get generic alternatives from the database
		let genericAlternatives = []
		if (drug.genericName) {
			const alts = await Drug.find({
				genericName: drug.genericName,
				_id: { $ne: drug._id }
			}).limit(5).lean()
			genericAlternatives = alts.map(alt => {
				const altStatus = normalizeStatus(alt.approvalStatus)
				const altResponseStatus = altStatus === 'genuine' ? 'genuine' : (altStatus === 'expired' ? 'counterfeit' : 'suspect')
				return {
					name: alt.name,
					manufacturer: alt.manufacturer,
					isGenuine: altStatus === 'genuine',
					status: altResponseStatus,
					price: Number(alt.brandPrice || 0),
					genericAlternatives: []
				}
			})
		}

		// FIXED: Return exactly the required response shape when drug is found
		return res.status(200).json({
			success: true,
			medicine: {
				name: drug.name,
				manufacturer: drug.manufacturer,
				isGenuine: dbStatus === 'genuine',
				status: responseStatus,
				price: Number(drug.brandPrice || 0),
				genericAlternatives: genericAlternatives
			}
		})
	} catch (error) {
		next(error)
	}
}

export const logScan = async (req, res, next) => {
	try {
		const { medicine, medicineName, result, lat, lng, latitude, longitude, district } =
			req.body || {}

		const normalizedMedicine = String(medicine || medicineName || '').trim()
		const normalizedResult = String(result || '').trim().toLowerCase() || 'not_found'
		const finalLat = Number(lat ?? latitude)
		const finalLng = Number(lng ?? longitude)

		if (!normalizedMedicine) {
			return res.status(400).json({ error: 'medicineName is required.' })
		}

		if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
			return res.status(400).json({ error: 'latitude and longitude are required.' })
		}

		const entry = await ScanLog.create({
			medicineName: normalizedMedicine,
			result: normalizedResult,
			latitude: finalLat,
			longitude: finalLng,
			district: district ? String(district).trim() : 'Unknown',
		})

		return res.status(201).json({
			ok: true,
			id: entry._id,
			medicineName: entry.medicineName,
			result: entry.result,
			latitude: entry.latitude,
			longitude: entry.longitude,
			district: entry.district,
			timestamp: entry.timestamp,
		})
	} catch (error) {
		next(error)
	}
}

export const getHeatmap = async (_req, res, next) => {
	try {
		// FIXED: query ScanLog to aggregate lat/lng before sending
		const raw = await ScanLog.find({}, 'latitude longitude medicineName result')

		const points = raw
			.filter(r => r.latitude && r.longitude)
			.map(r => {
				const status = r.result === 'genuine' ? 'genuine' : (r.result === 'expired' ? 'counterfeit' : 'suspect')
				return {
					lat: r.latitude,
					lng: r.longitude,
					name: r.medicineName,
					status: status
				}
			})

		// FIXED: send aggregated points Leaflet can consume directly
		return res.status(200).json({ success: true, points })
	} catch (error) {
		return res.status(500).json({ success: false, error: error.message })
	}
}

/*
CURL TESTS FOR MEDICINE CONTROLLER:

1. Test /api/verify with valid name parameter:
curl.exe -s "http://localhost:5000/api/verify?name=PAREDRINE"
Output:
{"success":true,"medicine":{"name":"PAREDRINE","manufacturer":"PHARMICS","isGenuine":true,"status":"genuine","price":0,"genericAlternatives":[]}}

2. Test /api/heatmap with valid token:
curl.exe -s -H "Authorization: Bearer <token>" http://localhost:5000/api/heatmap
Output:
{"success":true,"points":[{"lat":28.525539084872904,"lng":77.3894181224214,"name":"aa LE","status":"suspect"}]}
*/
