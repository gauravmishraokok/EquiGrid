import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import HostPage from './pages/HostPage'
import JoinPage from './pages/JoinPage'
import ParticipatePage from './pages/ParticipatePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/host" />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/participate/:buildingId" element={<ParticipatePage />} />
      </Routes>
    </BrowserRouter>
  )
}
