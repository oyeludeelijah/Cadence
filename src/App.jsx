import { Routes, Route, Navigate } from 'react-router-dom'
import TaskListPage   from './pages/TaskListPage'
import TaskDetailPage from './pages/TaskDetailPage'
import AuthPage       from './pages/AuthPage'
import { AppShell }   from './components/AppShell'
import { useAuth }    from './hooks/useAuth'
import './App.css'

function App() {
  const { session, loading } = useAuth()

  // Don't flash the login page before the session is resolved
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
      }}>
        <div className="spinner spinner-large" />
      </div>
    )
  }

  // Not authenticated → show AuthPage for every route.
  // BrowserRouter lives in main.jsx so the router is never recreated on sign-in.
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    )
  }

  // Authenticated → normal app
  return (
    <AppShell>
      <Routes>
        <Route path="/"          element={<TaskListPage />} />
        <Route path="/tasks/:id" element={<TaskDetailPage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App

