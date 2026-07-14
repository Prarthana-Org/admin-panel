import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Users() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setError('');
      const { data, error: err } = await supabase
        .from('app_users')
        .select('id, name, phone, email, language, country, is_pro, created_at, email_verified')
        .order('created_at', { ascending: false });
      if (err) {
        setError(err.message);
        setList([]);
      } else {
        setList(data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>App Users</h1>
        <p className="page-subtitle">Users registered in the Prarthana application</p>
      </header>

      <section className="card">
        {error && <p className="error-msg">{error}</p>}
        {loading ? (
          <div className="loading">Loading…</div>
        ) : list.length === 0 ? (
          <p className="empty-state">No users yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Language</th>
                  <th>Country</th>
                  <th>Pro</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '—'}</td>
                    <td className="mono">{u.phone || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{u.email || '—'}</span>
                        {u.email && (
                          u.email_verified ? (
                            <span className="badge-verified" title="Email Verified" style={{
                              backgroundColor: '#DEF7EC',
                              color: '#03543F',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>Verified</span>
                          ) : (
                            <span className="badge-unverified" title="Pending Verification" style={{
                              backgroundColor: '#FEF08A',
                              color: '#713F12',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>Pending</span>
                          )
                        )}
                      </div>
                    </td>
                    <td>{u.language || '—'}</td>
                    <td>{u.country || '—'}</td>
                    <td>{u.is_pro ? <span className="badge">Pro</span> : '—'}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.9rem' }}>{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
