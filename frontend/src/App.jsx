import React from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import TopNav from './components/TopNav'
import ProtectedRoute from './components/ProtectedRoute'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  

  return (
    <div className="app-root relative min-h-screen overflow-hidden bg-white text-slate-950 antialiased">
      <div className="pointer-events-none absolute inset-0">
        <div className="bg-blob blob-one" />
        <div className="bg-blob blob-two" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.08),transparent_18%),radial-gradient(circle_at_80%_15%,_rgba(34,197,94,0.06),transparent_16%)]" />
      </div>
      <TopNav />

      <main className="relative max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route
            path="/"
            element={
              <div className="glass-panel relative border border-white/5 shadow-2xl backdrop-blur-md bg-slate-900/40 rounded-[2rem] p-6 sm:p-8">
                <Outlet />
              </div>
            }
          >
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route
              path="/dashboard"
              element={
                <div className="glass-panel border border-white/5 shadow-2xl backdrop-blur-md bg-slate-900/40 rounded-[2rem] p-6 sm:p-8">
                  <DashboardPage />
                </div>
              }
            />
            <Route
              path="/settings"
              element={
                <div className="glass-panel border border-white/5 shadow-2xl backdrop-blur-md bg-slate-900/40 rounded-[2rem] p-6 sm:p-8">
                  <SettingsPage />
                </div>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
