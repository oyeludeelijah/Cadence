/**
 * CreateModalPanel.jsx
 *
 * Renders the modal overlay for creating a task. It intercepts the escape key
 * and overlay clicks, tracks the dirty state of the form to prompt a discard
 * confirmation, and uses useModalAnimation for GSAP entry/exit transitions.
 */

import { useState, useCallback, useEffect } from 'react'
import { useModalAnimation } from '../hooks/useModalAnimation'
import CreateTask from './CreateTask'

export default function CreateModalPanel({ onClose, onTaskCreated }) {
  const { panelRef, close } = useModalAnimation(onClose)
  const [isDirty, setIsDirty] = useState(false)
  const [showDiscard, setShowDiscard] = useState(false)

  const handleCloseAttempt = useCallback(() => {
    if (isDirty) {
      setShowDiscard(true)
    } else {
      close()
    }
  }, [isDirty, close])

  // Intercept Escape key
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        if (showDiscard) {
          setShowDiscard(false)
        } else {
          handleCloseAttempt()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showDiscard, handleCloseAttempt])

  return (
    <>
      {showDiscard && (
        <div 
          className="discard-confirm-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDiscard(false) }}
        >
          <div className="discard-confirm-panel">
            <h4>Discard Changes?</h4>
            <p>You have unsaved task details. Are you sure you want to exit?</p>
            <button 
              className="btn-danger" 
              style={{ width: '100%', padding: '10px' }}
              onClick={() => {
                setShowDiscard(false)
                close()
              }}
            >
              Yes, Discard All
            </button>
            <div className="discard-confirm-footer">
              Click anywhere outside to keep editing
            </div>
          </div>
        </div>
      )}

      <div
        className="modal-overlay bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Create new task"
        onClick={(e) => { if (e.target === e.currentTarget) handleCloseAttempt() }}
      >
        <div className="modal-panel glass" ref={panelRef}>
          <button
            className="modal-close-btn"
            onClick={handleCloseAttempt}
            aria-label="Close"
          >
            ×
          </button>
          <CreateTask 
             onTaskCreated={() => {
               close() 
               // The API call completed, and after 1.8s CreateTask calls us.
               // We close the GSAP animation, and then tell the parent to fetch.
               // Wait a beat matching the animation out before fetching so UI doesn't stutter.
               setTimeout(onTaskCreated, 180)
             }} 
             onIsDirtyChange={setIsDirty} 
          />
        </div>
      </div>
    </>
  )
}
