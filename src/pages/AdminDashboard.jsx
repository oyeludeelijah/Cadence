import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'

function AdminDashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Quick hardcoded check since user didn't specify role implementation
  const IS_ADMIN = session?.user?.email === 'oyeludeelijah@gmail.com'

  useEffect(() => {
    if (!session) return

    if (!IS_ADMIN) {
      navigate('/')
      return
    }

    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)

        if (error) throw error
        setLogs(data || [])
      } catch (err) {
        console.error('Failed to fetch logs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [session, navigate, IS_ADMIN])

  if (!IS_ADMIN) return null // Let the useEffect redirect

  return (
    <div className="container" style={{ paddingTop: 'var(--s10)' }}>
      <div style={{ marginBottom: 'var(--s6)' }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: 'var(--s2)' }}>
          System Intelligence
        </h1>
        <p className="section-eyebrow">Admin Dashboard</p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="spinner"></span> Loading telemetry...
        </div>
      ) : (
        <div className="glass" style={{ padding: 'var(--s4)', borderRadius: 'var(--r-xl)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--s4)' }}>Recent Errors</h2>
          
          {logs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">✨</span>
              <h3>All systems nominal</h3>
              <p>No errors logged in the system.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {logs.map(log => (
                <div key={log.id} style={{ 
                  padding: '16px', 
                  background: 'rgba(0,0,0,0.3)', 
                  border: '1px solid var(--border-2)', 
                  borderRadius: 'var(--r-md)' 
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className={`badge ${log.source === 'client' ? 'badge-warning' : 'badge-danger'}`}>
                      {log.source.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontWeight: 500, color: 'var(--text)' }}>{log.message}</p>
                  
                  {log.stack_trace && (
                    <pre style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      background: 'rgba(0,0,0,0.5)', 
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: 'var(--text-2)',
                      overflowX: 'auto'
                    }}>
                      {log.stack_trace}
                    </pre>
                  )}
                  {log.user_id && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-3)' }}>
                      User ID: {log.user_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
