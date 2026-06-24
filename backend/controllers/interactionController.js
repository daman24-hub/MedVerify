import { checkDrugInteractionsWithGemini } from '../services/geminiService.js'
import Drug from '../models/Drug.js'

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

		let modelText = null;
		try {
			// FIXED: Wrap Gemini API call with graceful error handling
			modelText = await checkDrugInteractionsWithGemini(medicines);
		} catch (err) {
			console.error('Gemini error:', err.message);
			// FIXED: Fallback to database-driven check when Gemini API key is invalid/fails
			try {
				const drug1 = await Drug.findOne({ name: { $regex: new RegExp(medicines[0].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') } }).lean();
				const drug2 = await Drug.findOne({ name: { $regex: new RegExp(medicines[1].replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i') } }).lean();

				if (drug1 && drug2 && drug1.genericName && drug2.genericName && drug1.genericName.toLowerCase() === drug2.genericName.toLowerCase()) {
					modelText = `DANGEROUS: Both medicines contain the same active chemical component (${drug1.genericName.toUpperCase()}). Taking them together can lead to accidental double-dosage and severe health risks (e.g., liver damage for Paracetamol). Apne doctor se confirm karein (consult your doctor).`;
				} else if (drug1 && drug2) {
					modelText = `CAUTION: Live AI interaction check is temporarily offline. Checked compositions: ${drug1.name} (${drug1.genericName || 'Unknown'}) and ${drug2.name} (${drug2.genericName || 'Unknown'}). Please verify safety with a pharmacist. Apne doctor se confirm karein (consult your doctor).`;
				} else {
					modelText = 'CAUTION: Live AI interaction check is temporarily unavailable. Please verify this combination with a doctor or pharmacist. Apne doctor se confirm karein (consult your doctor).';
				}
			} catch (fallbackErr) {
				modelText = 'CAUTION: Interaction safety checker is temporarily unavailable. Please consult your doctor. Apne doctor se confirm karein (consult your doctor).';
			}
		}

		const level = parseLevel(modelText)
		const safetyFlag = parseSafetyFlag(modelText)

		return res.status(200).json({
			success: true, // FIXED: include success flag
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

/*
CURL TESTS FOR INTERACTION CONTROLLER:

Test /api/interactions with valid token and body:
Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/interactions" -Headers @{ Authorization = "Bearer <token>" } -ContentType "application/json" -Body '{"medicines":["Paracetamol","Ibuprofen"]}'
Output:
{
    "success":  true,
    "safetyFlag":  "CAUTION",
    "level":  "flagged",
    "safe":  false,
    "summary":  "CAUTION: AI interaction service unavailable. Apne doctor se confirm karein (consult your doctor).",
    "interactions":  [
                         "CAUTION: AI interaction service unavailable. Apne doctor se confirm karein (consult your doctor)."
                     ]
}
*/
