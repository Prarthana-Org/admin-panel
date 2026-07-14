import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Layout() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('fakeSession');
    navigate('/login', { replace: true });
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav>
        <Link to="/" className="brand">
          <img src="/prarthana_logo.png" alt="Prarthana" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />
          Prarthana Admin
        </Link>
        <NavLink to="/courses">Courses</NavLink>
        <NavLink to="/banners">Banners</NavLink>
        <NavLink to="/temples">Temples</NavLink>
        <NavLink to="/audios">Audios</NavLink>
        <NavLink to="/users">Users</NavLink>
        <span className="spacer" />
        <button 
          type="button" 
          onClick={toggleTheme} 
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            color: 'var(--nav-text)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            boxShadow: 'none'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button type="button" className="logout-btn" onClick={logout}>
          Logout
        </button>
      </nav>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
