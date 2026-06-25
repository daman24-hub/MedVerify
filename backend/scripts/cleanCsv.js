import fs from 'fs'
import path from 'url'
import { fileURLToPath } from 'url'
import pathLib from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = pathLib.dirname(__filename)
const filePath = pathLib.join(__dirname, '..', 'data', 'All Drugs Ceiling Prices.csv')

if (fs.existsSync(filePath)) {
	const content = fs.readFileSync(filePath, 'utf8')
	const lines = content.split('\n')
	const headerIndex = lines.findIndex(line => line.includes('Formulation'))
	if (headerIndex >= 0) {
		console.log(`Found header at line ${headerIndex + 1}. Removing metadata lines.`)
		const cleanedLines = lines.slice(headerIndex)
		fs.writeFileSync(filePath, cleanedLines.join('\n'), 'utf8')
		console.log('Successfully cleaned All Drugs Ceiling Prices.csv')
	} else {
		console.log('Header line containing "Formulation" not found.')
	}
} else {
	console.log(`File not found: ${filePath}`)
}
