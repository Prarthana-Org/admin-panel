import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Courses() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    title: '',
    description: '',
    author_name: '',
    course_type: 'VIDEO',
    thumbnail_url: '',
  });

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setList(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await supabase.from('courses').insert({
      title: form.title,
      description: form.description || null,
      author_name: form.author_name,
      course_type: form.course_type,
      thumbnail_url: form.thumbnail_url || null,
    });
    setForm({ title: '', description: '', author_name: '', course_type: 'VIDEO', thumbnail_url: '' });
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
    setList(data || []);
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Courses</h1>
        <p className="page-subtitle">Manage courses and course videos</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add course</h2>
          <form onSubmit={create} className="form">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Course title"
              required
            />
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Brief description"
              rows={3}
            />
            <label>Author</label>
            <input
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              placeholder="Author name"
              required
            />
            <label>Type</label>
            <select
              value={form.course_type}
              onChange={(e) => setForm({ ...form, course_type: e.target.value })}
            >
              <option value="VIDEO">VIDEO</option>
              <option value="AUDIO">AUDIO</option>
              <option value="TEXT">TEXT</option>
              <option value="MIXED">MIXED</option>
            </select>
            <label>Thumbnail URL</label>
            <input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="https://..."
            />
            <button type="submit" className="btn btn-primary">Create course</button>
          </form>
        </section>

        <section className="card">
          <h2 className="card-title">All courses</h2>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : list.length === 0 ? (
            <p className="empty-state">No courses yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td>{c.title}</td>
                      <td>{c.author_name}</td>
                      <td><span className="badge">{c.course_type}</span></td>
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
