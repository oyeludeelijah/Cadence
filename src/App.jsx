import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import CreateTask from './CreateTask'
import './App.css'

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Checking...')

  useEffect(() => {
    async function checkConnection() {
      // First, check if environment variables are loaded
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
      console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
      
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        console.error('Environment variables not loaded!')
        setConnectionStatus('Env vars missing')
        return
      }
      
      try {
        // Simple connection test using auth
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Supabase error details:', error)
          setConnectionStatus(`Error: ${error.message}`)
        } else {
          console.log('Supabase connected successfully!')
          setConnectionStatus('✓ Connected')
        }
      } catch (err) {
        console.error('Supabase connection error:', err)
        setConnectionStatus(`Error: ${err.message}`)
      }
    }
    checkConnection()
  }, [])

  return (
    <div style={{ minHeight: '100vh', padding: '2rem' }}>
      <div className="mesh-gradient"></div>
      
      {/* Connection Status Header */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          marginBottom: '1rem',
          color: 'var(--text-color)'
        }}>
          Task Management System
        </h1>
        
        <div style={{ 
          fontSize: '0.9rem', 
          color: connectionStatus.includes('Connected') ? '#10b981' : '#f43f5e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: connectionStatus.includes('Connected') ? '#10b981' : '#f43f5e',
            boxShadow: connectionStatus.includes('Connected') ? '0 0 10px #10b981' : '0 0 10px #f43f5e'
          }}></span>
          Supabase: {connectionStatus}
        </div>
      </div>

      {/* Task Creation Form */}
      <CreateTask />
    </div>
  )
}

export default App
