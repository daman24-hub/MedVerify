import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary' // FIXED: import ErrorBoundary
import './index.css'
import 'leaflet/dist/leaflet.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>  {/* FIXED: catches any component crash */}
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
