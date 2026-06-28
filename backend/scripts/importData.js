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
	name: ['name', 'brand_name', 'medicine_name', 'drug_name', 'formulation'],
	manufacturer: ['manufacturer', 'company', 'company_name'],
	approvalStatus: ['approvalstatus', 'approval_status', 'status'],
	genericName: ['genericname', 'generic_name', 'salt', 'composition', 'formulation'],
	brandPrice: ['brandprice', 'brand_price', 'mrp', 'price'],
	genericPrice: ['genericprice', 'generic_price', 'jan_aushadhi_price', 'ja_price', 'ceiling_price_excluding_taxes_rs_per_unit_'],
}

const normalizeHeader = (value) =>
	String(value || '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')

const toNumber = (value) => {
	const cleaned = String(value ?? '').replace(/,/g, '').trim()
	const match = cleaned.match(/[0-9]+(?:\.[0-9]+)?/)
	if (match) {
		const parsed = Number(match[0])
		return Number.isFinite(parsed) ? parsed : 0
	}
	return 0
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
			columns: (headers) => {
				const normalized = headers.map(normalizeHeader)
				
				// Validate critical columns
				const hasNameAlias = normalized.some(h => normalizeKeyMap.name.includes(h))
				const hasGenericNameAlias = normalized.some(h => normalizeKeyMap.genericName.includes(h))
				const hasBrandPriceAlias = normalized.some(h => normalizeKeyMap.brandPrice.includes(h))
				const hasGenericPriceAlias = normalized.some(h => normalizeKeyMap.genericPrice.includes(h))

				if (!hasNameAlias && !hasGenericNameAlias) {
					console.warn(`⚠️  WARNING [CSV Header Validation]: No column in "${path.basename(filePath)}" matches 'name' or 'genericName' aliases. Import may fail to extract medicine names.`);
				}
				if (!hasBrandPriceAlias && !hasGenericPriceAlias) {
					console.warn(`⚠️  WARNING [CSV Header Validation]: No column in "${path.basename(filePath)}" matches 'brandPrice' or 'genericPrice' aliases. Prices may default to 0.`);
				}

				return normalized
			},
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

		console.log(`Performing bulk upserts for ${allDocs.length} drug records in batches of 1000...`)
		const batchSize = 1000
		let upsertedCount = 0
		let modifiedCount = 0
		let matchedCount = 0

		for (let i = 0; i < allDocs.length; i += batchSize) {
			const batch = allDocs.slice(i, i + batchSize)
			const operations = batch.map(doc => ({
				updateOne: {
					filter: { name: doc.name, manufacturer: doc.manufacturer },
					update: { $set: doc },
					upsert: true
				}
			}))

			const res = await Drug.bulkWrite(operations, { ordered: false })
			upsertedCount += res.upsertedCount || res.nUpserted || 0
			modifiedCount += res.modifiedCount || res.nModified || 0
			matchedCount += res.matchedCount || res.nMatched || 0

			console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allDocs.length / batchSize)}`)
		}

		console.log(`✅ Import complete — Matched: ${matchedCount}, Upserted: ${upsertedCount}, Modified: ${modifiedCount}`);
		process.exit(0);
	} catch (err) {
		console.error('❌ Import failed:', err.message);
		process.exit(1);
	}
}

run()
