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

	let name = String(entry.name || '').trim()
	if (!name && entry.genericName) {
		name = String(entry.genericName).trim()
	}

	if (!name) return null

	let manufacturer = String(entry.manufacturer || '').trim()
	if (!manufacturer && (row.drug_code || row.group_name)) {
		manufacturer = 'PMBJP (Jan Aushadhi)'
	}
	if (!manufacturer) {
		manufacturer = 'Unknown'
	}

	let approvalStatus = String(entry.approvalStatus || '').trim()
	if (!approvalStatus && (row.drug_code || row.group_name)) {
		approvalStatus = 'Approved'
	}
	if (!approvalStatus) {
		approvalStatus = 'flagged'
	}

	const brandPrice = toNumber(entry.brandPrice)
	const genericPrice = toNumber(entry.genericPrice)

	return {
		name,
		manufacturer,
		approvalStatus,
		genericName: String(entry.genericName || name).trim(),
		brandPrice: brandPrice || genericPrice,
		genericPrice: genericPrice || brandPrice,
	}
}

const run = async () => {
	// FIXED: Support multiple CSV file path arguments
	const csvPaths = process.argv.slice(2);
	if (csvPaths.length === 0) {
		console.log("Usage: node importData.js <path-to-csv-1> <path-to-csv-2> ...");
		process.exit(1);
	}

	try {
		// FIXED: Wrap existing import logic in try/catch
		await connectDB()

		let allDocs = []
		for (const csvPath of csvPaths) {
			console.log(`Reading and parsing CSV: ${csvPath}...`)
			const rows = await readCsv(csvPath)
			const docs = rows.map(mapRowToDrug).filter(Boolean)
			console.log(`Found ${docs.length} valid drug records in ${csvPath}`)
			allDocs.push(...docs)
		}

		if (allDocs.length === 0) {
			console.log('No data found in the specified CSV files.')
			process.exit(0)
		}

		console.log(`Wiping existing Drug collection...`)
		await Drug.deleteMany({})

		console.log(`Inserting ${allDocs.length} total drug records...`)
		await Drug.insertMany(allDocs, { ordered: false })

		console.log(`✅ Import complete — ${allDocs.length} records inserted`);
		process.exit(0);
	} catch (err) {
		console.error('❌ Import failed:', err.message);
		process.exit(1);
	}
}

run()
