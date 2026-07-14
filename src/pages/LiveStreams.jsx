import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const LANGUAGES = [
  { value: 'en_US', label: 'English' },
  { value: 'hi_IN', label: 'हिन्दी' },
  { value: 'ru_RU', label: 'Русский' },
  { value: 'ta_IN', label: 'தமிழ்' },
  { value: 'te_IN', label: 'తెలుగు' },
  { value: 'bn_IN', label: 'বাংলা' },
  { value: 'gu_IN', label: 'ગુજરાતી' },
];

export default function LiveStreams() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({ name: '', place: '', youtube_url: '', language: 'en_US' });

  const loadStreams = async () => {
    setLoading(true);
    let q = supabase
      .from('live_streams')
      .select('id,name,place,youtube_url,language,is_active')
      .order('created_at', { ascending: false });
    if (languageFilter) q = q.eq('language', languageFilter);
    const { data, error } = await q;
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadStreams();
  }, [languageFilter]);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    setErrorMsg('');

    try {
      if (!form.youtube_url) {
        throw new Error('Please provide a YouTube URL.');
      }

      const { data: inserted, error } = await supabase
        .from('live_streams')
        .insert({
          name: form.name,
          place: form.place,
          youtube_url: form.youtube_url,
          language: form.language || 'en_US',
        })
        .select()
        .single();

      if (error) throw error;

      if (inserted) {
        setForm({ name: '', place: '', youtube_url: '', language: 'en_US' });
        setList((prev) => [inserted, ...prev]);
      }
    } catch (err) {
      console.error('Error creating live stream:', err);
      setErrorMsg(err.message || 'Failed to create live stream.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this live stream?')) return;
    await supabase.from('live_streams').delete().eq('id', id);
    setList((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('live_streams')
      .update({ is_active: !currentStatus })
      .eq('id', id);
    if (!error) {
      setList(prev => prev.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s));
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Live Streams</h1>
        <p className="page-subtitle">Manage 24/7 Live Streaming URLs (YouTube)</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add Live Stream</h2>
          <form onSubmit={create} className="form">
            <label>Stream Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Main Temple Live Aarti"
              required
            />
            
            <label>Place</label>
            <input
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
              placeholder="e.g. Varanasi, India"
              required
            />

            <label>YouTube URL</label>
            <input
              value={form.youtube_url}
              onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              required
            />
            
            <label>Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            {errorMsg && <p className="error-msg">{errorMsg}</p>}
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Adding…' : 'Add Stream'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All Live Streams</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Filter by language:</span>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
              >
                <option value="">All languages</option>
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </label>
          </div>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : list.length === 0 ? (
            <p className="empty-state">No live streams yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name & Place</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{s.place}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                          <span className="badge">{LANGUAGES.find((l) => l.value === (s.language || 'en_US'))?.label || s.language || 'en'}</span>
                        </div>
                      </td>
                      <td>
                        <a href={s.youtube_url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                          Watch
                        </a>
                      </td>
                      <td>
                        <button 
                          onClick={() => toggleActive(s.id, s.is_active)}
                          style={{
                            background: s.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: s.is_active ? '#22c55e' : '#ef4444',
                            border: `1px solid ${s.is_active ? '#22c55e' : '#ef4444'}`,
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {s.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(s.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
