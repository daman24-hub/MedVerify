import OcrResult from '../models/OcrResult.js'
import Drug from '../models/Drug.js'
import { extractMedicineNameFromImage } from '../services/geminiService.js'
import { fetchGenericAlternatives } from './medicineController.js'

const normalizeStatus = (approvalStatus) => {
	const value = String(approvalStatus || '').toLowerCase()
	if (value.includes('counterfeit') || 
		value.includes('expired') || 
		value.includes('fake') || 
		value.includes('banned') || 
		value.includes('suspended') || 
		value.includes('recalled') || 
		value.includes('withdrawn')) {
		return 'expired'
	}
	if (value.includes('approved') || 
		value.includes('genuine') || 
		value.includes('active') || 
		value.includes('safe')) {
		return 'genuine'
	}
	return 'flagged'
}

export const verifyMedicineImage = async (req, res, next) => {
	try {
		const { image, userId } = req.body || {}
		if (!image) {
			return res.status(400).json({ error: 'Base64 image is required.' })
		}

		// Parse the base64 data url
		const match = image.match(/^data:([^;]+);base64,(.+)$/)
		if (!match) {
			return res.status(400).json({ error: 'Invalid base64 image data URL format.' })
		}

		const mimeType = match[1]
		const base64Data = match[2]

		let extractedName = ''
		try {
			console.log(`[IMAGE OCR] Sending image to Gemini for name extraction...`)
			extractedName = await extractMedicineNameFromImage(base64Data, mimeType)
			console.log(`[IMAGE OCR] Gemini extracted name: "${extractedName}"`)
		} catch (ocrError) {
			console.error(`[IMAGE OCR] Gemini name extraction failed:`, ocrError.message)
			return res.status(502).json({
				success: false,
				error: 'Gemini OCR name extraction failed. Please verify API key configuration or use local OCR fallback.',
				details: ocrError.message
			})
		}

		if (!extractedName || extractedName.toUpperCase() === 'INVALID_IMAGE') {
			return res.status(400).json({
				error: 'Please scan a valid medicine or upload a valid image.'
			})
		}

		// Persist the OCR result in the database
		let ocrRecordId = null
		try {
			const ocrRecord = new OcrResult({
				userId: userId || 'guest',
				text: extractedName,
				status: 'pending'
			})
			await ocrRecord.save()
			ocrRecordId = ocrRecord._id || ocrRecord.id
		} catch (dbErr) {
			console.error('Failed to save OCR record during image verify:', dbErr.message)
		}

		// 1. Prioritize $text Search Over Regex using the text index
		let drug = await Drug.findOne(
			{ $text: { $search: extractedName } },
			{ score: { $meta: 'textScore' } }
		).sort({ score: { $meta: 'textScore' } }).lean()

		if (!drug) {
			// Fallback to regex match if text search returns no results
			const searchRegex = new RegExp(extractedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i')
			drug = await Drug.findOne({
				$or: [
					{ name: { $regex: searchRegex } },
					{ genericName: { $regex: searchRegex } },
					{ manufacturer: { $regex: searchRegex } },
				],
			}).lean()
		}

		if (!drug) {
			// Token-based keyword fallback search
			const cleanWords = extractedName
				.toLowerCase()
				.split(/[\s\-\/\(\)\.,]+/)
				.filter(w => w.length >= 3)
				.filter(w => !['tablets', 'tablet', 'capsules', 'capsule', 'suspension', 'syrup', 'injection', 'ip', 'usp', 'bp', 'mg', 'mcg', 'ml', 'rx'].includes(w));

			if (cleanWords.length > 0) {
				console.log(`[IMAGE OCR VERIFY] No direct match for "${extractedName}". Trying keyword fallback for:`, cleanWords);
				
				// 2. Optimize the Keyword Fallback Logic by combining into a single query
				const wordRegexes = cleanWords.map(word => new RegExp(`\\b${word}\\b`, 'i'));
				const wordOrClauses = wordRegexes.map(regex => ({
					$or: [
						{ name: { $regex: regex } },
						{ genericName: { $regex: regex } }
					]
				}));

				drug = await Drug.findOne({ $or: wordOrClauses }).lean();

				// If word boundary match fails, try a simple substring match for the keywords in a single query
				if (!drug) {
					const substringRegexes = cleanWords.map(word => new RegExp(word, 'i'));
					const substringOrClauses = substringRegexes.map(regex => ({
						$or: [
							{ name: { $regex: regex } },
							{ genericName: { $regex: regex } }
						]
					}));
					
					drug = await Drug.findOne({ $or: substringOrClauses }).lean();
				}
			}
		}

		if (!drug) {
			console.log(`[IMAGE OCR VERIFY] No match found in database for: "${extractedName}"`)
			return res.status(200).json({
				success: true,
				medicine: {
					name: extractedName,
					manufacturer: 'Unknown',
					isGenuine: false,
					status: 'suspect',
					price: 0,
					genericAlternatives: []
				},
				ocrRecordId
			})
		}

		console.log(`[IMAGE OCR VERIFY] Match found: "${extractedName}" -> "${drug.name}"`)

		const dbStatus = normalizeStatus(drug.approvalStatus)
		const responseStatus = dbStatus === 'genuine' ? 'genuine' : (dbStatus === 'expired' ? 'counterfeit' : 'suspect')

		// Get generic alternatives
		let genericAlternatives = []
		if (drug.genericName) {
			const alts = await fetchGenericAlternatives(drug)
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

		return res.status(200).json({
			success: true,
			medicine: {
				name: drug.name,
				manufacturer: drug.manufacturer,
				isGenuine: dbStatus === 'genuine',
				status: responseStatus,
				price: Number(drug.brandPrice || 0),
				genericAlternatives
			},
			ocrRecordId
		})

	} catch (error) {
		next(error)
	}
}
