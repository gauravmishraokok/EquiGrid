import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import HostPage from './pages/HostPage'
import JoinPage from './pages/JoinPage'
import ParticipatePage from './pages/ParticipatePage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/participate/:buildingId" element={<ParticipatePage />} />
      </Routes>
    </BrowserRouter>
  )
}
