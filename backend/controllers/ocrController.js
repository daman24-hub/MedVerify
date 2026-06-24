import OcrResult from '../models/OcrResult.js'

// Save OCR result
export const saveOcrResult = async (req, res) => {
	try {
		const { userId, text } = req.body
		if (!userId || !text) {
			return res.status(400).json({ error: 'userId and text are required.' })
		}
		const result = new OcrResult({ userId, text })
		await result.save()
		res.status(201).json(result)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
}

// Fetch all OCR results
export const getOcrResults = async (req, res) => {
	try {
		const results = await OcrResult.find()
		res.json(results)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
}

// Update verification status
export const verifyStatus = async (req, res) => {
	try {
		const { id, verified } = req.body
		if (!id) {
			return res.status(400).json({ error: 'id is required.' })
		}
		const result = await OcrResult.findById(id)
		if (!result) return res.status(404).json({ error: 'Not found' })

		result.status = verified ? 'verified' : 'rejected'
		await result.save()
		res.json(result)
	} catch (err) {
		res.status(500).json({ error: err.message })
	}
}
