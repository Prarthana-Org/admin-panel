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

export default function Banners() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [form, setForm] = useState({ title: '', image_url: '', action_url: '', language: 'en_US' });

  const loadBanners = async () => {
    setLoading(true);
    let q = supabase
      .from('banners')
      .select('id,title,image_url,action_url,language')
      .order('display_order', { ascending: true });
    if (languageFilter) q = q.eq('language', languageFilter);
    const { data, error } = await q;
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadBanners();
  }, [languageFilter]);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { data: inserted, error } = await supabase
      .from('banners')
      .insert({
        title: form.title,
        image_url: form.image_url,
        action_url: form.action_url || null,
        language: form.language || 'en_US',
      })
      .select()
      .single();
    setCreating(false);
    if (!error && inserted) {
      setForm({ title: '', image_url: '', action_url: '', language: 'en_US' });
      setList((prev) => [inserted, ...prev].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    await supabase.from('banners').delete().eq('id', id);
    setList((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Banners</h1>
        <p className="page-subtitle">Home screen carousel banners</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add banner</h2>
          <form onSubmit={create} className="form">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Banner title"
              required
            />
            <label>Image URL</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
              required
            />
            <label>Action URL (e.g. YouTube)</label>
            <input
              value={form.action_url}
              onChange={(e) => setForm({ ...form, action_url: e.target.value })}
              placeholder="https://www.youtube.com/..."
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
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Creating…' : 'Create banner'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All banners</h2>
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
            <p className="empty-state">No banners yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Language</th>
                    <th>Preview</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id}>
                      <td className="mono">{b.id}</td>
                      <td>{b.title}</td>
                      <td><span className="badge">{LANGUAGES.find((l) => l.value === (b.language || 'en_US'))?.label || b.language || 'en'}</span></td>
                      <td>
                        {b.image_url ? (
                          <a href={b.image_url} target="_blank" rel="noreferrer" className="link">
                            View image
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(b.id)}>
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
