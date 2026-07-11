import React from 'react';
import { supabase } from '../supabaseClient';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to Supabase system_logs
    this.logErrorToDB(error, errorInfo);
  }

  async logErrorToDB(error, errorInfo) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await supabase.from('system_logs').insert([{
        source: 'client',
        message: error.message || String(error),
        stack_trace: errorInfo.componentStack || error.stack,
        user_id: session?.user?.id || null
      }]);
    } catch (dbError) {
      console.error('Failed to log to system_logs:', dbError);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass" style={{ padding: 'var(--s6)', textAlign: 'center', borderRadius: 'var(--r-xl)', maxWidth: '500px' }}>
            <h2 style={{ color: 'var(--danger)', marginBottom: 'var(--s2)' }}>Something went wrong.</h2>
            <p style={{ marginBottom: 'var(--s4)' }}>The app crashed. We have logged this error for the admin to review.</p>
            <button 
              className="btn-primary" 
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
