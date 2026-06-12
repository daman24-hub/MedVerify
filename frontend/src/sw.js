import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

const VERIFY_CACHE = 'dawacheck-verify-v1'
const MAX_VERIFY_ENTRIES = 20

self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})

const trimVerifyCache = async () => {
	const cache = await caches.open(VERIFY_CACHE)
	const keys = await cache.keys()
	if (keys.length <= MAX_VERIFY_ENTRIES) return

	const overflow = keys.length - MAX_VERIFY_ENTRIES
	const toDelete = keys.slice(0, overflow)
	await Promise.all(toDelete.map((request) => cache.delete(request)))
}

self.addEventListener('fetch', (event) => {
	const { request } = event
	const isVerifyRequest =
		request.method === 'GET' &&
		request.url.includes('/api/verify')

	if (!isVerifyRequest) return

	event.respondWith(
		(async () => {
			const cache = await caches.open(VERIFY_CACHE)
			try {
				const networkResponse = await fetch(request)
				if (networkResponse.ok) {
					await cache.put(request, networkResponse.clone())
					await trimVerifyCache()
				}
				return networkResponse
			} catch {
				const cached = await cache.match(request)
				if (cached) return cached
				return new Response(JSON.stringify({
					status: 'not_found',
					message: 'Offline and no cached lookup found.',
				}), {
					status: 503,
					headers: { 'Content-Type': 'application/json' },
				})
			}
		})(),
	)
})

self.addEventListener('push', (event) => {
	const payload = event.data?.json?.() || {
		title: 'DawaCheck Reminder',
		body: 'Medicine recheck reminder is due.',
	}

	event.waitUntil(
		self.registration.showNotification(payload.title || 'DawaCheck Reminder', {
			body: payload.body || 'Apni dawa ko recheck karein.',
			icon: '/icon-192.png',
			badge: '/icon-192.png',
		}),
	)
})

self.addEventListener('notificationclick', (event) => {
	event.notification.close()
	event.waitUntil(clients.openWindow('/'))
})
