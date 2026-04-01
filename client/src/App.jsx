import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './components/Navbar'
import LandingPage from './pages/LandingPage'
import ScanPage from './pages/ScanPage'
import ReportPage from './pages/ReportPage'
import HistoryPage from './pages/HistoryPage'
import NotFoundPage from './pages/NotFoundPage'
import ComparePage from './pages/ComparePage'
import { Toast } from './components/Toast'

function AnimatedRoutes({ scannedUrl, setScannedUrl, scanResult, setScanResult, showToast }) {
  const location = useLocation()
  return (
    <div key={location.pathname} className="animate-fade-up">
      <Routes location={location}>
        <Route path="/" element={<LandingPage setScannedUrl={setScannedUrl} showToast={showToast} />} />
        <Route path="/scan" element={<ScanPage scannedUrl={scannedUrl} setScanResult={setScanResult} showToast={showToast} />} />
        <Route path="/report/:scanId" element={<ReportPage scanResult={scanResult} showToast={showToast} />} />
        <Route path="/report" element={<ReportPage scanResult={scanResult} showToast={showToast} />} />
        <Route path="/history" element={<HistoryPage showToast={showToast} />} />
        <Route path="/compare" element={<ComparePage showToast={showToast} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const [scannedUrl, setScannedUrl] = useState('')
  const [scanResult, setScanResult] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'info') => setToast({ message, type, id: Date.now() })

  return (
    <HashRouter>
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <Navbar />
        <AnimatedRoutes
          scannedUrl={scannedUrl}
          setScannedUrl={setScannedUrl}
          scanResult={scanResult}
          setScanResult={setScanResult}
          showToast={showToast}
        />
        {toast && (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </HashRouter>
  )
}
