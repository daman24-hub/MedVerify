import { GoogleGenerativeAI } from '@google/generative-ai'

const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const apiKey = process.env.GEMINI_API_KEY

const client = apiKey ? new GoogleGenerativeAI(apiKey) : null

const modelCandidates = [
	model,
	'gemini-2.0-flash',
	'gemini-2.5-flash',
	'gemini-flash-latest',
]

const getModel = (modelName, systemInstruction) => {
	if (!client) return null
	return client.getGenerativeModel({
		model: modelName,
		systemInstruction,
	})
}

const isQuotaOrAvailabilityError = (error) => {
	const message = String(error?.message || '').toLowerCase()
	return (
		message.includes('429') ||
		message.includes('quota') ||
		message.includes('rate limit') ||
		message.includes('resource exhausted')
	)
}

const generateText = async ({ userPrompt, systemInstruction }) => {
	for (const modelName of modelCandidates) {
		try {
			const activeModel = getModel(modelName, systemInstruction)
			if (!activeModel) return ''

			const response = await activeModel.generateContent(userPrompt)
			const text = response?.response?.text?.()?.trim() || ''
			if (text) return text
		} catch (error) {
			const message = String(error?.message || '')
			if (message.includes('is not found') || message.includes('not supported')) {
				continue
			}
			throw error
		}
	}

	return ''
}

export const translateToHindi = async (resultText) => {
	if (!client) {
		return 'Hindi translation unavailable. GEMINI_API_KEY set karein.'
	}

	const text = await generateText({
		systemInstruction:
			'You translate medical safety summaries into simple Hindi in exactly 2 short sentences.',
		userPrompt: `Translate to simple Hindi in 2 sentences: ${resultText}`,
	})

	return text || 'Hindi translation unavailable right now.'
}

export const checkDrugInteractionsWithGemini = async (medicines) => {
	if (!client) {
		return 'CAUTION: AI interaction service unavailable. Apne doctor se confirm karein (consult your doctor).'
	}

	const userPrompt = `Check interaction risk for: ${medicines.join(', ')}`
	let text = ''

	try {
		text = await generateText({
			systemInstruction:
				'You check drug interactions. Reply with one of: SAFE / CAUTION / DANGEROUS. Always end with: Apne doctor se confirm karein (consult your doctor). Never diagnose. Never say a drug is wrong for someone. Flags only.',
			userPrompt,
		})
	} catch (error) {
		if (!isQuotaOrAvailabilityError(error)) {
			throw error
		}

		return 'CAUTION: Live AI interaction check is temporarily unavailable due to API limits. Please verify this combination with a doctor or pharmacist. Apne doctor se confirm karein (consult your doctor).'
	}

	return text || 'CAUTION: Could not compute interactions. Apne doctor se confirm karein (consult your doctor).'
}

export const verifyWithCsdco = async (ocrText, databaseMatch) => {
	if (!client) {
		return 'Safety verification service unavailable. Please set GEMINI_API_KEY.'
	}

	const databaseContext = databaseMatch 
		? `Local Database Record Found: Name: ${databaseMatch.name}, Approved Status: ${databaseMatch.approvalStatus}, Composition: ${databaseMatch.genericName || 'N/A'}`
		: 'No exact match found in local reference files.'

	const systemInstruction = 
		'You are an expert pharmaceutical verification assistant cross-referencing text with the Central Drugs Standard Control Organisation (CDSCO) regulations of India. Analyze the text for active chemical components, safety status, and compliance flags. Keep warnings objective and clear.'

	const userPrompt = `
Analyze the following medicine data from an OCR image scan:
---
Raw OCR Text: "${ocrText}"
${databaseContext}
---

Provide a well-structured safety report including:
1. CDSCO List Status: Is the identified composition approved, banned, or regulated under restricted categories in India?
2. Risk Category: (Low / Moderate / High Risk)
3. Direct Contraindications: Short safety constraints (e.g., interactions with alcohol, pregnancy, or driving).
4. Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) Insight: Recommend looking for a generic formulation if an exact match is not transparently established.

End explicitly with: "Disclaimer: Medical verification models provide informational guidance. Always cross-examine with a certified practitioner before dosage alteration."
`

	try {
		return await generateText({ systemInstruction, userPrompt })
	} catch (error) {
		return 'Safety check service temporarily unavailable. Confirm composition with your pharmacist.'
	}
}
