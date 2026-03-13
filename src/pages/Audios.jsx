import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Audios() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', artist: '', audio_url: '', image_url: '' });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('audios')
        .select('id,title,artist,audio_url,image_url')
        .order('created_at', { ascending: false });
      if (!error) setList(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await supabase.from('audios').insert({
      title: form.title,
      artist: form.artist,
      audio_url: form.audio_url,
      image_url: form.image_url || null,
    });
    setForm({ title: '', artist: '', audio_url: '', image_url: '' });
    const { data } = await supabase
      .from('audios')
      .select('id,title,artist,audio_url,image_url')
      .order('created_at', { ascending: false });
    setList(data || []);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Audios</h1>
        <p className="page-subtitle">Chants and audio content</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add audio</h2>
          <form onSubmit={create} className="form">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Morning Chant"
              required
            />
            <label>Artist</label>
            <input
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              placeholder="Artist or performer"
              required
            />
            <label>Audio URL</label>
            <input
              value={form.audio_url}
              onChange={(e) => setForm({ ...form, audio_url: e.target.value })}
              placeholder="https://..."
              required
            />
            <label>Image URL</label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://..."
            />
            <button type="submit" className="btn btn-primary">Create audio</button>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">All audios</h2>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : list.length === 0 ? (
            <p className="empty-state">No audios yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Artist</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{a.id}</td>
                      <td>{a.title}</td>
                      <td>{a.artist}</td>
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
