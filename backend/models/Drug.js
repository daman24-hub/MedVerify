import mongoose from 'mongoose'

const drugSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true, index: true },
		manufacturer: { type: String, default: 'Unknown', trim: true },
		approvalStatus: { type: String, default: 'flagged', trim: true },
		genericName: { type: String, default: '', trim: true },
		genericPrice: { type: Number, default: 0, min: 0 },
		brandPrice: { type: Number, default: 0, min: 0 },
	},
	{ timestamps: true },
)

drugSchema.index({ name: 'text', genericName: 'text', manufacturer: 'text' })

const Drug = mongoose.models.Drug || mongoose.model('Drug', drugSchema)

export default Drug
