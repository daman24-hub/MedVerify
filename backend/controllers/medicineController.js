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
		const drug = await Drug.findOne({
			$or: [
				{ name: { $regex: searchRegex } },
				{ genericName: { $regex: searchRegex } },
				{ manufacturer: { $regex: searchRegex } },
			],
		}).lean()

		if (!drug) {
			console.log(`[VERIFY] No match found for: "${rawName}"`)
			return res.status(200).json({
				status: 'not_found',
				medicine: rawName,
				genericName: null,
				brandPrice: 0,
				genericPrice: 0,
				hindiText:
					'Dawa database me nahi mili. Kripya pharmacist se confirm karein.',
			})
		}

		console.log(`[VERIFY] Match found: "${rawName}" -> "${drug.name}"`)

		const englishSummary = buildEnglishSummary(drug)
		let hindiText =
			'Yeh dawa record me mili. Kripya use se pehle doctor se salah lein.'

		try {
			hindiText = await translateToHindi(englishSummary)
		} catch {
			// Translation failure should not block verify API.
		}

		const status = normalizeStatus(drug.approvalStatus)

		return res.status(200).json({
			status,
			medicine: drug.name,
			approvalStatus: drug.approvalStatus,
			manufacturer: drug.manufacturer,
			genericName: drug.genericName,
			brandPrice: Number(drug.brandPrice || 0),
			genericPrice: Number(drug.genericPrice || 0),
			price: Number(drug.brandPrice || 0),
			marketAverage: Number(drug.genericPrice || 0),
			advice: englishSummary,
			hindiText,
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
		const byDistrict = await ScanLog.aggregate([
			{
				$group: {
					_id: '$district',
					totalScans: { $sum: 1 },
					flaggedCount: {
						$sum: {
							$cond: [
								{ $in: ['$result', ['flagged', 'expired', 'dangerous']] },
								1,
								0,
							],
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					district: { $ifNull: ['$_id', 'Unknown'] },
					totalScans: 1,
					flaggedCount: 1,
				},
			},
			{ $sort: { flaggedCount: -1, totalScans: -1 } },
		])

		const points = await ScanLog.aggregate([
			{
				$group: {
					_id: {
						lat: { $round: ['$latitude', 3] },
						lng: { $round: ['$longitude', 3] },
					},
					count: { $sum: 1 },
					flaggedCount: {
						$sum: {
							$cond: [
								{ $in: ['$result', ['flagged', 'expired', 'dangerous']] },
								1,
								0,
							],
						},
					},
				},
			},
			{
				$project: {
					_id: 0,
					lat: '$_id.lat',
					lng: '$_id.lng',
					count: 1,
					flaggedCount: 1,
				},
			},
			{ $sort: { count: -1 } },
		])

		const totalScans = await ScanLog.countDocuments()

		return res.status(200).json({
			totalScans,
			byDistrict,
			points,
		})
	} catch (error) {
		next(error)
	}
}
