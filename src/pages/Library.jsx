import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Library() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'book', file_url: '', cover_image_url: '' });

  const loadLibrary = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_library')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadLibrary();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { data: inserted, error } = await supabase
      .from('app_library')
      .insert({
        title: form.title,
        description: form.description || null,
        type: form.type,
        file_url: form.file_url || null,
        cover_image_url: form.cover_image_url || null,
      })
      .select()
      .single();
    setCreating(false);
    if (!error && inserted) {
      setForm({ title: '', description: '', type: 'book', file_url: '', cover_image_url: '' });
      setList((prev) => [inserted, ...prev]);
    } else {
      alert('Error creating library item: ' + (error?.message || 'Unknown error'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this library item?')) return;
    await supabase.from('app_library').delete().eq('id', id);
    setList((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Library (Books & Vedas)</h1>
        <p className="page-subtitle">Manage books and sacred texts</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add item</h2>
          <form onSubmit={create} className="form">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="E.g., Rig Veda"
              required
            />
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="A brief description..."
            />
            <label>Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="book">Book</option>
              <option value="veda">Veda</option>
            </select>
            <label>File URL (PDF/EPUB)</label>
            <input
              value={form.file_url}
              onChange={(e) => setForm({ ...form, file_url: e.target.value })}
              placeholder="https://..."
            />
            <label>Cover Image URL</label>
            <input
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              placeholder="https://..."
            />
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Creating…' : 'Create item'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All library items</h2>
          </div>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : list.length === 0 ? (
            <p className="empty-state">No items yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td className="mono">{t.id}</td>
                      <td>{t.title}</td>
                      <td><span className="badge">{t.type}</span></td>
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
