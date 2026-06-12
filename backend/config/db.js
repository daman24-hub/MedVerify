import mongoose from 'mongoose'

const shouldUseDirectFallback = (mongoUri, error) => {
	const message = String(error?.message || '')
	return (
		String(mongoUri || '').startsWith('mongodb+srv://') &&
		(message.includes('querySrv') || error?.code === 'ECONNREFUSED')
	)
}

const resolveDnsJson = async (name, type) => {
	const endpoint = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`
	const response = await fetch(endpoint)
	if (!response.ok) {
		throw new Error(`DNS lookup failed for ${name} (${type})`)
	}

	const payload = await response.json()
	return Array.isArray(payload.Answer) ? payload.Answer : []
}

const buildDirectMongoUri = async (mongoUri) => {
	const source = new URL(mongoUri)
	const srvName = `_mongodb._tcp.${source.hostname}`

	const [srvAnswers, txtAnswers] = await Promise.all([
		resolveDnsJson(srvName, 'SRV'),
		resolveDnsJson(source.hostname, 'TXT'),
	])

	const hosts = srvAnswers
		.map((answer) => String(answer.data || '').trim())
		.map((record) => record.split(/\s+/))
		.filter((parts) => parts.length >= 4)
		.map((parts) => `${parts[3].replace(/\.$/, '')}:${parts[2]}`)

	if (hosts.length === 0) {
		throw new Error('Could not resolve Atlas SRV hosts for direct MongoDB connection.')
	}

	const params = new URLSearchParams(source.search)
	params.set('ssl', 'true')

	for (const answer of txtAnswers) {
		const text = String(answer.data || '').replace(/^"|"$/g, '')
		const extra = new URLSearchParams(text)
		for (const [key, value] of extra.entries()) {
			if (!params.has(key)) params.set(key, value)
		}
	}

	if (!params.has('retryWrites')) params.set('retryWrites', 'true')
	if (!params.has('w')) params.set('w', 'majority')

	const auth = `${source.username}:${source.password}`
	const dbPath = source.pathname || '/dawacheck'
	return `mongodb://${auth}@${hosts.join(',')}${dbPath}?${params.toString()}`
}

export const connectDB = async () => {
	const mongoUri = process.env.MONGO_URI

	if (!mongoUri) {
		throw new Error('MONGO_URI is missing in environment variables.')
	}

	try {
		await mongoose.connect(mongoUri)
	} catch (error) {
		if (!shouldUseDirectFallback(mongoUri, error)) {
			throw error
		}

		const directUri = await buildDirectMongoUri(mongoUri)
		await mongoose.connect(directUri)
	}

	console.log('Connected to MongoDB')

	return mongoose.connection
}
