import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			strategies: 'injectManifest',
			srcDir: 'src',
			filename: 'sw.js',
			devOptions: {
				enabled: true,
			},
			manifest: {
				name: 'DawaCheck',
				short_name: 'DawaCheck',
				theme_color: '#0C2340',
				background_color: '#ffffff',
				display: 'standalone',
				icons: [
					{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
				],
			},
		}),
	],
	server: {
		host: true,
		port: 5173,
	},
})
