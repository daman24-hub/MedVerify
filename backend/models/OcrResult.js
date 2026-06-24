import mongoose from 'mongoose'

const ocrResultSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	text: { type: String, required: true },
	status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
	createdAt: { type: Date, default: Date.now }
})

const OcrResult = mongoose.models.OcrResult || mongoose.model('OcrResult', ocrResultSchema)

export default OcrResult
