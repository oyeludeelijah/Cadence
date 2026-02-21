/**
 * DeleteConfirmModal
 *
 * A reusable confirmation modal for destructive delete actions.
 *
 * Props:
 *   taskTitle  {string}  — Title of the task being deleted
 *   loading    {bool}    — Disables the delete button and shows a spinner
 *   onConfirm  {fn}      — Called when the user clicks "Delete"
 *   onCancel   {fn}      — Called when the user clicks "Cancel" or the backdrop
 */
function DeleteConfirmModal({ taskTitle, loading, onConfirm, onCancel }) {
  return (
    <>
      {/* Backdrop — click outside to cancel */}
      <div className="modal-overlay" onClick={onCancel} style={{ alignItems: 'center' }} />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: '480px',
        }}
      >
        <div
          className="glass modal-panel"
          style={{
            padding: 'var(--s5)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderTop: '2px solid var(--danger)',
          }}
        >
          <h2
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--danger)',
              marginBottom: 'var(--s3)',
            }}
          >
            🗑️ Delete Task
          </h2>

          <p style={{ color: 'var(--text)', marginBottom: 'var(--s2)', fontSize: 'var(--text-base)' }}>
            Are you sure you want to delete <strong>"{taskTitle}"</strong>?
          </p>

          <p style={{ color: 'var(--text-2)', fontSize: 'var(--text-sm)', marginBottom: 'var(--s5)' }}>
            This will permanently delete the task and all its checkpoints. This action cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: 'var(--s2)', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>

            <button
              className="btn-danger"
              onClick={onConfirm}
              disabled={loading}
              style={{
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--s1)',
              }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default DeleteConfirmModal
