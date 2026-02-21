import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TaskListPage  from './pages/TaskListPage'
import TaskDetailPage from './pages/TaskDetailPage'
import { useTheme } from './hooks/useTheme'
import './App.css'

function App() {
  const { theme, toggle } = useTheme()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<TaskListPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
      </Routes>

      {/* ── Floating theme toggle — visible on every page ──────────────────── */}
      <button
        className="theme-toggle"
        onClick={toggle}
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label="Toggle colour theme"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </BrowserRouter>
  )
}

export default App
