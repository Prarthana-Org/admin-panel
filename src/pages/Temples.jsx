import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Temples() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', thumbnail_url: '', latitude: '', longitude: '' });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('temples')
        .select('id,name,latitude,longitude,thumbnail_url')
        .order('created_at', { ascending: false });
      if (!error) setList(data || []);
      setLoading(false);
    };
    load();
  }, []);

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
      })
      .select()
      .single();
    setCreating(false);
    if (!error && inserted) {
      setForm({ name: '', thumbnail_url: '', latitude: '', longitude: '' });
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
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create temple'}
            </button>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">All temples</h2>
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
