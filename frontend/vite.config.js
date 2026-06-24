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
				type: 'module',
			},
			manifest: {
				name: 'MedVerify',
				short_name: 'MedVerify',
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
		// FIXED: Proxy config using env target
		proxy: {
			'/api': {
				target: process.env.VITE_API_URL || 'http://localhost:5000',
				changeOrigin: true
			}
		}
	},
	// FIXED: Automatically strip console logs on production builds
	build: {
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,  // FIXED: strip all console.log in prod build
				drop_debugger: true
			}
		}
	}
})
