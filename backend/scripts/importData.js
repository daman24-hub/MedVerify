import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import Drug from '../models/Drug.js'
import { connectDB } from '../config/db.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '..', 'data')

const normalizeKeyMap = {
	name: ['name', 'brand_name', 'medicine_name', 'drug_name'],
	manufacturer: ['manufacturer', 'company', 'company_name'],
	approvalStatus: ['approvalstatus', 'approval_status', 'status'],
	genericName: ['genericname', 'generic_name', 'salt', 'composition'],
	brandPrice: ['brandprice', 'brand_price', 'mrp', 'price'],
	genericPrice: ['genericprice', 'generic_price', 'jan_aushadhi_price', 'ja_price'],
}

const normalizeHeader = (value) =>
	String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')

const toNumber = (value) => {
	const cleaned = String(value ?? '')
		.replace(/,/g, '')
		.replace(/[^0-9.]/g, '')
	const parsed = Number(cleaned)
	return Number.isFinite(parsed) ? parsed : 0
}

const resolveField = (row, aliases) => {
	for (const key of aliases) {
		if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
			return row[key]
		}
	}
	return ''
}

const readCsv = async (filePath) => {
	return new Promise((resolve, reject) => {
		const rows = []
		if (!fs.existsSync(filePath)) {
			resolve(rows)
			return
		}

		const parser = parse({
			bom: true,
			columns: (headers) => headers.map(normalizeHeader),
			trim: true,
			skip_empty_lines: true,
		})

		fs.createReadStream(filePath)
			.pipe(parser)
			.on('data', (record) => rows.push(record))
			.on('end', () => resolve(rows))
			.on('error', (error) => reject(error))
	})
}

const mapRowToDrug = (row) => {
	const entry = {}
	for (const [target, aliases] of Object.entries(normalizeKeyMap)) {
		entry[target] = resolveField(row, aliases)
	}

	const name = String(entry.name || '').trim()
	if (!name) return null

	return {
		name,
		manufacturer: String(entry.manufacturer || 'Unknown').trim(),
		approvalStatus: String(entry.approvalStatus || 'flagged').trim(),
		genericName: String(entry.genericName || '').trim(),
		brandPrice: toNumber(entry.brandPrice),
		genericPrice: toNumber(entry.genericPrice),
	}
}

const run = async () => {
	await connectDB()

	const cdscoPath = path.join(DATA_DIR, 'cdsco.csv')
	const janAushadhiPath = path.join(DATA_DIR, 'jan_aushadhi.csv')

	const [cdscoRows, janRows] = await Promise.all([readCsv(cdscoPath), readCsv(janAushadhiPath)])
	const cdscoDocs = cdscoRows.map(mapRowToDrug).filter(Boolean)
	const janDocs = janRows.map(mapRowToDrug).filter(Boolean)
	const docs = [...cdscoDocs, ...janDocs]

	if (docs.length === 0) {
		console.log('No data imported. Add cdsco.csv and jan_aushadhi.csv in backend/data.')
		process.exit(0)
	}

	await Drug.deleteMany({})
	await Drug.insertMany(docs, { ordered: false })

	console.log(`Imported ${docs.length} records into Drug collection.`)
	process.exit(0)
}

run().catch((error) => {
	console.error('Import failed:', error.message)
	process.exit(1)
})
