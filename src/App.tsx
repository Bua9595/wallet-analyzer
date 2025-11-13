import { HashRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ResultsPage from './pages/ResultsPage'
import DarkModeToggle from './components/DarkModeToggle'

export default function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <DarkModeToggle />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results/:wallet" element={<ResultsPage />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
