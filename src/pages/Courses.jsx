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

export default function Courses() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoCreating, setVideoCreating] = useState(false);
  const [videoForm, setVideoForm] = useState({ title: '', video_url: '', episodenumber: 1 });
  const [form, setForm] = useState({
    title: '',
    description: '',
    author_name: '',
    course_type: 'VIDEO',
    thumbnail_url: '',
    language: 'en_US',
  });

  const loadCourses = async () => {
    setLoading(true);
    let q = supabase.from('courses').select('*').order('created_at', { ascending: false });
    if (languageFilter) q = q.eq('language', languageFilter);
    const { data, error } = await q;
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, [languageFilter]);

  const loadVideos = async (courseId) => {
    if (!courseId) return;
    setVideosLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .order('episodenumber', { ascending: true });
    if (!error) setVideos(data || []);
    setVideosLoading(false);
  };

  useEffect(() => {
    if (selectedCourseId) loadVideos(selectedCourseId);
    else setVideos([]);
  }, [selectedCourseId]);

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    const { data: inserted, error } = await supabase
      .from('courses')
      .insert({
        title: form.title,
        description: form.description || null,
        author_name: form.author_name,
        course_type: form.course_type,
        thumbnail_url: form.thumbnail_url || null,
        language: form.language || 'en_US',
      })
      .select()
      .single();
    setCreating(false);
    if (!error && inserted) {
      setForm({ title: '', description: '', author_name: '', course_type: 'VIDEO', thumbnail_url: '', language: 'en_US' });
      setList((prev) => [inserted, ...prev]);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this course? Videos in it will also be deleted.')) return;
    await supabase.from('courses').delete().eq('id', id);
    setList((prev) => prev.filter((c) => c.id !== id));
    if (selectedCourseId === id) setSelectedCourseId(null);
  };

  const addVideo = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) return;
    setVideoCreating(true);
    const { data: inserted, error } = await supabase
      .from('videos')
      .insert({
        course_id: selectedCourseId,
        title: videoForm.title || null,
        video_url: videoForm.video_url,
        episodenumber: parseInt(videoForm.episodenumber, 10) || 1,
      })
      .select()
      .single();
    setVideoCreating(false);
    if (!error && inserted) {
      setVideoForm({ title: '', video_url: '', episodenumber: videos.length + 1 });
      setVideos((prev) => [...prev, inserted].sort((a, b) => a.episodenumber - b.episodenumber));
    }
  };

  const removeVideo = async (id) => {
    if (!window.confirm('Delete this video?')) return;
    await supabase.from('videos').delete().eq('id', id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const filteredList = list;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Courses</h1>
        <p className="page-subtitle">Manage courses with language filter and course videos</p>
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
            <label>Language</label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
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
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create course'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All courses</h2>
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
          ) : filteredList.length === 0 ? (
            <p className="empty-state">No courses yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Language</th>
                    <th>Author</th>
                    <th>Type</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((c) => (
                    <tr key={c.id}>
                      <td className="mono">{c.id}</td>
                      <td>{c.title}</td>
                      <td><span className="badge">{LANGUAGES.find((l) => l.value === (c.language || 'en_US'))?.label || c.language || 'en'}</span></td>
                      <td>{c.author_name}</td>
                      <td><span className="badge">{c.course_type}</span></td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setSelectedCourseId(selectedCourseId === c.id ? null : c.id)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          {selectedCourseId === c.id ? 'Hide videos' : 'Manage videos'}
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
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

      {selectedCourseId && (
        <section className="card" style={{ marginTop: '1.5rem' }}>
          <h2 className="card-title">
            Course videos — {list.find((c) => c.id === selectedCourseId)?.title || ''}
          </h2>
          <form onSubmit={addVideo} className="form" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '1rem', alignItems: 'end' }}>
            <label>
              Title
              <input
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                placeholder="Video title"
              />
            </label>
            <label>
              Video URL
              <input
                value={videoForm.video_url}
                onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
                required
              />
            </label>
            <label>
              Episode #
              <input
                type="number"
                min={1}
                value={videoForm.episodenumber}
                onChange={(e) => setVideoForm({ ...videoForm, episodenumber: e.target.value })}
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={videoCreating}>
              {videoCreating ? 'Adding…' : 'Add video'}
            </button>
          </form>
          {videosLoading ? (
            <div className="loading">Loading videos…</div>
          ) : videos.length === 0 ? (
            <p className="empty-state">No videos in this course. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Title</th>
                    <th>Video URL</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id}>
                      <td className="mono">{v.episodenumber}</td>
                      <td>{v.title || '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={v.video_url}>{v.video_url}</td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => removeVideo(v.id)}>
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
      )}
    </div>
  );
}
