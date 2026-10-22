import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPage() {
  const { user } = useAuth()
  const defaultHours = { start: 9, end: 21 }
  const [workingHours, setWorkingHours] = useState(user?.user_metadata?.working_hours || defaultHours)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [message, setMessage] = useState(null) // {type, text}

  // Effect to hide message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const saveWorkingHours = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { working_hours: { start: Number(workingHours.start), end: Number(workingHours.end) } }
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Working hours updated successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const exportData = async () => {
    setIsExporting(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, checkpoints(*)`)
      if (error) throw error
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ai-accountability-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      setMessage({ type: 'success', text: 'Data exported successfully.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to export data: ' + err.message })
    } finally {
      setIsExporting(false)
    }
  }

  const deleteAccount = async () => {
    if (!window.confirm("Are you completely sure? This permanently deletes all your tasks, checkpoints, and your account.")) return
    try {
      // First try to call custom rpc if backend implements it
      const { error } = await supabase.rpc('delete_user')
      if (error) throw error
      await supabase.auth.signOut()
    } catch (err) {
      console.warn("Delete account RPC failed:", err.message)
      setMessage({ type: 'error', text: 'Account deletion requires contacting the administrator in this demo app version or via a backend RPC function.' })
    }
  }

  return (
    <div style={{ maxWidth: 'var(--container-max)', margin: '0 auto', paddingBottom: 'var(--s8)' }}>
      <header style={{ marginBottom: 'var(--s6)', paddingBottom: 'var(--s4)', borderBottom: '1px solid var(--border)' }}>
        <div>
          <p className="section-eyebrow" style={{ marginBottom: '6px' }}>Preferences</p>
          <h1 style={{ fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text)', lineHeight: 1.1 }}>
            Settings
          </h1>
        </div>
      </header>
      
      {/* 1. Working Hours */}
      <section className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', marginBottom: 'var(--s6)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--s2)' }}>Working Hours</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s4)' }}>
          Set your regular study schedule. The AI will only plan checkpoints during these hours (unless a deadline is incredibly urgent).
        </p>

        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
          <div className="field-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="field-label">Start Time</label>
            <select 
              className="field-select"
              value={workingHours.start}
              onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={`start-${i}`} value={i}>
                  {i === 0 ? 'Midnight' : i === 12 ? 'Noon' : i < 12 ? `${i} AM` : `${i - 12} PM`}
                </option>
              ))}
            </select>
          </div>
          <div className="field-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="field-label">End Time</label>
            <select 
              className="field-select"
              value={workingHours.end}
              onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={`end-${i}`} value={i}>
                  {i === 0 ? 'Midnight' : i === 12 ? 'Noon' : i < 12 ? `${i} AM` : `${i - 12} PM`}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <button className="btn-primary" onClick={saveWorkingHours} disabled={isSaving}>
          {isSaving ? <span className="spinner" style={{ borderTopColor: '#fff', width: '16px', height: '16px' }} /> : '\u2714 Save Schedule'}
        </button>
      </section>

      {/* 2. Account & Data Management */}
      <section className="glass" style={{ padding: 'var(--s6)', borderRadius: 'var(--r-xl)', marginBottom: 'var(--s6)', borderTop: '2px solid rgba(239,68,68,0.2)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, marginBottom: 'var(--s2)', color: 'var(--danger)' }}>Data & Privacy</h2>
        <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s4)' }}>
          Manage your account data and overall presence on the platform.
        </p>
        
        <div style={{ display: 'flex', gap: 'var(--s4)', flexWrap: 'wrap' }}>
          <button 
            className="btn-primary" 
            onClick={exportData}
            disabled={isExporting}
            style={{ 
              background: 'var(--glass-bg)', 
              color: 'var(--text)',
              border: '1px solid var(--glass-border)'
            }}
          >
            {isExporting ? 'Exporting...' : '📥 Export My Data'}
          </button>
          
          <button 
            className="btn-primary" 
            onClick={deleteAccount}
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            🗑️ Delete Account
          </button>
        </div>
      </section>

      {/* Global Alert Notification */}
      {message && (
        <div 
          className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'}`}
          style={{ position: 'fixed', bottom: 'var(--s6)', right: 'var(--s6)', maxWidth: '400px', zIndex: 100 }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
