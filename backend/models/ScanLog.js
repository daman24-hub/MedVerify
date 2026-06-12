import mongoose from 'mongoose'

const scanLogSchema = new mongoose.Schema({
	medicineName: { type: String, required: true, trim: true, index: true },
	result: {
		type: String,
		required: true,
		enum: ['genuine', 'flagged', 'expired', 'not_found', 'safe', 'caution', 'dangerous'],
		default: 'not_found',
	},
	latitude: { type: Number, required: true },
	longitude: { type: Number, required: true },
	district: { type: String, default: 'Unknown', trim: true, index: true },
	timestamp: { type: Date, default: Date.now, index: true },
})

scanLogSchema.index({ latitude: 1, longitude: 1 })

const ScanLog = mongoose.models.ScanLog || mongoose.model('ScanLog', scanLogSchema)

export default ScanLog
