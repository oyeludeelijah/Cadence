/**
 * useAuth — re-exported from AuthContext for backward-compatible imports.
 *
 * All components import from '../hooks/useAuth' as before.
 * The actual subscription logic lives in AuthContext.jsx (single shared instance).
 * See src/contexts/AuthContext.jsx for implementation details.
 */
export { useAuth } from '../contexts/AuthContext'
