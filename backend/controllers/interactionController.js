import { checkDrugInteractionsWithGemini } from '../services/geminiService.js'

const parseLevel = (text) => {
	const normalized = String(text || '').toUpperCase()
	if (normalized.includes('DANGEROUS')) return 'expired'
	if (normalized.includes('CAUTION')) return 'flagged'
	return 'genuine'
}

const parseSafetyFlag = (text) => {
	const normalized = String(text || '').toUpperCase()
	if (normalized.includes('DANGEROUS')) return 'DANGEROUS'
	if (normalized.includes('CAUTION')) return 'CAUTION'
	return 'SAFE'
}

export const checkInteractions = async (req, res, next) => {
	try {
		const medicines = Array.isArray(req.body?.medicines)
			? req.body.medicines.map((item) => String(item).trim()).filter(Boolean)
			: []

		if (medicines.length < 2) {
			return res.status(400).json({
				error: 'At least two medicines are required.',
			})
		}

		const modelText = await checkDrugInteractionsWithGemini(medicines)
		const level = parseLevel(modelText)
		const safetyFlag = parseSafetyFlag(modelText)

		return res.status(200).json({
			safetyFlag,
			level,
			safe: safetyFlag === 'SAFE',
			summary: modelText,
			interactions: [modelText],
		})
	} catch (error) {
		next(error)
	}
}
