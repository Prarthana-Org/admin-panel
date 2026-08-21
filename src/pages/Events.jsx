import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Events() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', location: '', image_url: '' });

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_events')
      .select('*')
      .order('date', { ascending: true });
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { data: inserted, error } = await supabase
      .from('app_events')
      .insert({
        title: form.title,
        description: form.description || null,
        date: form.date ? new Date(form.date).toISOString() : null,
        location: form.location || null,
        image_url: form.image_url || null,
      })
      .select()
      .single();
    setCreating(false);
    if (!error && inserted) {
      setForm({ title: '', description: '', date: '', location: '', image_url: '' });
      setList((prev) => [...prev, inserted].sort((a,b) => new Date(a.date) - new Date(b.date)));
    } else {
      alert('Error creating event: ' + (error?.message || 'Unknown error'));
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    await supabase.from('app_events').delete().eq('id', id);
    setList((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Events</h1>
        <p className="page-subtitle">Manage upcoming spiritual events</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add event</h2>
          <form onSubmit={create} className="form">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="E.g., Grand Aarti"
              required
            />
            <label>Date & Time</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <label>Location</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="E.g., Kashi Vishwanath"
            />
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Event details..."
            />
            <label>Image URL</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Creating…' : 'Create event'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All events</h2>
          </div>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : list.length === 0 ? (
            <p className="empty-state">No events yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td>{t.title}</td>
                      <td>{t.date ? new Date(t.date).toLocaleString() : 'TBD'}</td>
                      <td>{t.location}</td>
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
