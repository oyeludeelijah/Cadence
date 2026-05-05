import { Routes, Route, Navigate } from 'react-router-dom'
import TaskListPage    from './pages/TaskListPage'
import TaskDetailPage  from './pages/TaskDetailPage'
import AnalyticsPage   from './pages/AnalyticsPage'
import AuthPage        from './pages/AuthPage'
import SettingsPage    from './pages/SettingsPage'
import LandingPage     from './pages/LandingPage'
import FeaturesPage    from './pages/FeaturesPage'
import AboutPage       from './pages/AboutPage'
import ContactPage     from './pages/ContactPage'
import { AppShell }    from './components/AppShell'
import { useAuth }     from './hooks/useAuth'
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

  // Not authenticated → show LandingPage on "/" and AuthPage under "/auth".
  // Everything else redirects to LandingPage.
  if (!session) {
    return (
      <Routes>
        <Route path="/"          element={<LandingPage />} />
        <Route path="/features"  element={<FeaturesPage />} />
        <Route path="/about"     element={<AboutPage />}    />
        <Route path="/contact"   element={<ContactPage />}  />
        <Route path="/auth"      element={<AuthPage />}     />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  // Authenticated → normal app
  return (
    <AppShell>
      <Routes>
        <Route path="/"           element={<TaskListPage />} />
        <Route path="/tasks/:id"  element={<TaskDetailPage />} />
        <Route path="/analytics"  element={<AnalyticsPage />} />
        <Route path="/settings"   element={<SettingsPage />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

export default App

