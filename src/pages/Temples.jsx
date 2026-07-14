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

export default function Temples() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [form, setForm] = useState({ name: '', thumbnail_url: '', latitude: '', longitude: '', language: 'en_US' });

  const loadTemples = async () => {
    setLoading(true);
    let q = supabase
      .from('temples')
      .select('id,name,latitude,longitude,thumbnail_url,language')
      .order('created_at', { ascending: false });
    if (languageFilter) q = q.eq('language', languageFilter);
    const { data, error } = await q;
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadTemples();
  }, [languageFilter]);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { data: inserted, error } = await supabase
      .from('temples')
      .insert({
        name: form.name,
        thumbnail_url: form.thumbnail_url || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        language: form.language || 'en_US',
      })
      .select()
      .single();
    setCreating(false);
    if (!error && inserted) {
      setForm({ name: '', thumbnail_url: '', latitude: '', longitude: '', language: 'en_US' });
      setList((prev) => [inserted, ...prev]);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this temple?')) return;
    await supabase.from('temples').delete().eq('id', id);
    setList((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Temples</h1>
        <p className="page-subtitle">Temple locations and info</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add temple</h2>
          <form onSubmit={create} className="form">
            <label>Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Temple name"
              required
            />
            <label>Thumbnail URL</label>
            <input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="https://..."
            />
            <div className="form-row">
              <div>
                <label>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                  placeholder="e.g. 30.7346"
                />
              </div>
              <div>
                <label>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                  placeholder="e.g. 79.0669"
                />
              </div>
            </div>
            <label>Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Creating…' : 'Create temple'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All temples</h2>
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
            <p className="empty-state">No temples yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Language</th>
                    <th>Lat</th>
                    <th>Lng</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{t.id}</td>
                      <td>{t.name}</td>
                      <td><span className="badge">{LANGUAGES.find((l) => l.value === (t.language || 'en_US'))?.label || t.language || 'en'}</span></td>
                      <td className="mono">{t.latitude ?? '—'}</td>
                      <td className="mono">{t.longitude ?? '—'}</td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(t.id)}>
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
