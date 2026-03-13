import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Banners() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', image_url: '', action_url: '' });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id,title,image_url,action_url')
        .order('display_order', { ascending: true });
      if (!error) setList(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await supabase.from('banners').insert({
      title: form.title,
      image_url: form.image_url,
      action_url: form.action_url || null,
    });
    setForm({ title: '', image_url: '', action_url: '' });
    const { data } = await supabase
      .from('banners')
      .select('id,title,image_url,action_url')
      .order('display_order', { ascending: true });
    setList(data || []);
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
            <button type="submit" className="btn btn-primary">Create banner</button>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">All banners</h2>
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
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id}>
                      <td className="mono">{b.id}</td>
                      <td>{b.title}</td>
                      <td>
                        {b.image_url ? (
                          <a href={b.image_url} target="_blank" rel="noreferrer" className="link">
                            View image
                          </a>
                        ) : (
                          '—'
                        )}
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
