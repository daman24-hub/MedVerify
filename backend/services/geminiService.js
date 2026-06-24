import { GoogleGenerativeAI } from '@google/generative-ai'

const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
let client = null
const getClient = () => {
	if (!client && process.env.GEMINI_API_KEY) {
		client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
	}
	return client
}

const modelCandidates = [
	model,
	'gemini-2.0-flash',
	'gemini-2.5-flash',
	'gemini-flash-latest',
]

const getModel = (modelName, systemInstruction) => {
	const activeClient = getClient()
	if (!activeClient) return null
	return activeClient.getGenerativeModel({
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
	if (!getClient()) {
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
	if (!getClient()) {
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
	if (!getClient()) {
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

export const extractMedicineNameFromImage = async (base64Data, mimeType) => {
	if (!getClient()) {
		throw new Error('Gemini API key is not configured.');
	}

	// Default to gemini-2.0-flash which supports multimodal content
	const activeModel = getModel('gemini-2.0-flash', 'You are an expert pharmaceutical verification assistant. Your task is to identify the main brand name or generic chemical name of the medicine printed on the medicine box or strip shown in the image.');

	if (!activeModel) {
		throw new Error('Could not initialize Gemini model.');
	}

	const prompt = `Identify the medicine name from this image. Return ONLY the main brand name or generic composition name in plain text, with no other words, explanation, punctuation, or formatting. If there are multiple names, return the most prominent brand name (e.g., "Calpol 500", "Augmentin 625").`;

	try {
		const result = await activeModel.generateContent([
			{
				inlineData: {
					data: base64Data,
					mimeType: mimeType
				}
			},
			prompt
		]);

		return result?.response?.text?.()?.trim() || '';
	} catch (error) {
		console.error('Gemini content generation failed:', error.message);
		throw error;
	}
}
