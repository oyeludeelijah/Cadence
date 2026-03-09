import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TaskListPage   from './pages/TaskListPage'
import TaskDetailPage from './pages/TaskDetailPage'
import { AppShell }   from './components/AppShell'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/"          element={<TaskListPage />} />
          <Route path="/tasks/:id" element={<TaskDetailPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
