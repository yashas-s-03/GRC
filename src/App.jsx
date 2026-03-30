import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import ScanPage from './pages/ScanPage'
import ReportPage from './pages/ReportPage'
import NotFoundPage from './pages/NotFoundPage'

function AnimatedRoutes({ scannedUrl, setScannedUrl }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-fade-up">
      <Routes location={location}>
        <Route path="/" element={<LandingPage setScannedUrl={setScannedUrl} />} />
        <Route path="/scan" element={<ScanPage scannedUrl={scannedUrl} />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const [scannedUrl, setScannedUrl] = useState('')

  return (
    <HashRouter>
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <Navbar />
        <AnimatedRoutes scannedUrl={scannedUrl} setScannedUrl={setScannedUrl} />
      </div>
    </HashRouter>
  )
}
