import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Layout() {
  const navigate = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav>
        <Link to="/" className="brand">
          <img src="/prarthana_logo.png" alt="Prarthana" style={{ height: 28, marginRight: 8, verticalAlign: 'middle' }} />
          Prarthana Admin
        </Link>
        <Link to="/courses">Courses</Link>
        <Link to="/banners">Banners</Link>
        <Link to="/temples">Temples</Link>
        <Link to="/audios">Audios</Link>
        <Link to="/users">Users</Link>
        <span className="spacer" />
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
