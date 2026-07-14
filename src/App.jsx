import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Banners from './pages/Banners';
import Temples from './pages/Temples';
import Audios from './pages/Audios';
import Users from './pages/Users';
import Shorts from './pages/Shorts';
import LiveStreams from './pages/LiveStreams';
import Notifications from './pages/Notifications';

function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>Loading…</span>
      </div>
    );
  }

  const isAuthenticated = !!session;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
          <Route index element={<Dashboard />} />
          <Route path="courses" element={<Courses />} />
          <Route path="banners" element={<Banners />} />
          <Route path="temples" element={<Temples />} />
          <Route path="audios" element={<Audios />} />
          <Route path="shorts" element={<Shorts />} />
          <Route path="live-streams" element={<LiveStreams />} />
          <Route path="users" element={<Users />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

