import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useModalAnimation } from '../hooks/useModalAnimation'

export default function OverdueResolutionModal({ checkpoints, onClose, onAllResolved, onProgress }) {
  const { panelRef, close } = useModalAnimation(onClose)
  const [loadingId, setLoadingId] = useState(null)
  const [reschedulingId, setReschedulingId] = useState(null)
  const [newDate, setNewDate] = useState('')

  // Auto-close when the list becomes empty
  useEffect(() => {
    if (checkpoints.length === 0) {
      onAllResolved()
    }
  }, [checkpoints, onAllResolved])

  async function handleMarkDone(cp) {
    setLoadingId(cp.id)
    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', cp.id)
      
      if (error) throw error
      onProgress() // trigger parent refetch
    } catch (err) {
      console.error(err)
      alert('Failed to update checkpoint.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleSaveReschedule(cp) {
    if (!newDate) return
    setLoadingId(cp.id)
    try {
      const { error } = await supabase
        .from('checkpoints')
        .update({ 
          due_date: new Date(newDate).toISOString(),
          reschedule_count: (cp.reschedule_count || 0) + 1
        })
        .eq('id', cp.id)
      
      if (error) throw error
      setReschedulingId(null)
      setNewDate('')
      onProgress() // trigger parent refetch
    } catch (err) {
      console.error(err)
      alert('Failed to reschedule checkpoint.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      <div className="modal-overlay" style={{ alignItems: 'center' }} />
      <div
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)', zIndex: 9999,
          width: '90%', maxWidth: '600px', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column'
        }}
      >
        <div ref={panelRef} className="glass modal-panel" style={{ padding: 'var(--s5)', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--danger)', marginBottom: 'var(--s2)' }}>
            ⚠️ Action Required
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 'var(--s5)' }}>
            You have overdue checkpoints. You must resolve them before taking on new tasks.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
            {checkpoints.map((cp) => (
              <div key={cp.id} style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--s3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--s3)'
              }}>
                <div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {cp.taskTitle}
                  </p>
                  <p style={{ fontWeight: 600, color: 'var(--text)' }}>
                    {cp.checkpoint_type}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--s2)', flexWrap: 'wrap', alignItems: 'center' }}>
                  {reschedulingId === cp.id ? (
                    <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={newDate}
                        onChange={e => setNewDate(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button 
                        className="btn-primary" 
                        onClick={() => handleSaveReschedule(cp)}
                        disabled={loadingId === cp.id || !newDate}
                      >
                        {loadingId === cp.id ? '...' : 'Save'}
                      </button>
                      <button 
                        className="btn-secondary" 
                        onClick={() => setReschedulingId(null)}
                        disabled={loadingId === cp.id}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button 
                        className="btn-primary" 
                        onClick={() => handleMarkDone(cp)}
                        disabled={loadingId === cp.id}
                        style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                      >
                        {loadingId === cp.id ? '...' : '✓ Mark as Done'}
                      </button>

                      {/* Only allow Reschedule if reschedule_count is 0 or undefined */}
                      {(!cp.reschedule_count || cp.reschedule_count < 1) && (
                        <button 
                          className="btn-secondary" 
                          onClick={() => setReschedulingId(cp.id)}
                          disabled={loadingId === cp.id}
                        >
                          📅 Reschedule
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 'var(--s5)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={close}>
              Cancel (Close Modal)
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
