import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError || !data.session) {
        setError(authError?.message || 'Invalid credentials');
      } else {
        // Check if the user is an admin
        const { data: userProfile, error: profileError } = await supabase
          .from('app_users')
          .select('role')
          .eq('auth_user_id', data.user.id)
          .single();
        
        if (profileError || userProfile?.role !== 'admin') {
          await supabase.auth.signOut();
          setError('Access Denied. You do not have admin privileges.');
        } else {
          window.location.href = '/';
        }
      }
    } catch (err) {
      setError(err?.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundImage: 'url(/temple1.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative'
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(13, 5, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}></div>
      <div
        className="card"
        style={{
          maxWidth: 420,
          width: '100%',
          position: 'relative',
          zIndex: 1,
          border: '1px solid rgba(255, 179, 0, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          background: 'rgba(20, 10, 0, 0.4)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/prarthana_logo.png" alt="Prarthana" style={{ height: 64, marginBottom: '1rem', filter: 'drop-shadow(0 0 8px rgba(255,179,0,0.5))' }} />
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', background: 'linear-gradient(135deg, #FFD700, #FFB300)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Prarthana Admin
          </h1>
          <p style={{ margin: 0, color: 'var(--text-hint)', fontSize: '0.95rem' }}>
            Sign in to manage spiritual content
          </p>
        </div>
        <form onSubmit={submit}>
          <div>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
