import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const MAX_VIDEO_MB = 100;
const MAX_COVER_MB = 5;

const LANGUAGES = [
  { value: 'en_US', label: 'English' },
  { value: 'hi_IN', label: 'हिन्दी' },
  { value: 'ru_RU', label: 'Русский' },
  { value: 'ta_IN', label: 'தமிழ்' },
  { value: 'te_IN', label: 'తెలుగు' },
  { value: 'bn_IN', label: 'বাংলা' },
  { value: 'gu_IN', label: 'ગુજરાતી' },
];

function generatePath() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function Shorts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [form, setForm] = useState({ title: '', video_url: '', thumbnail_url: '', language: 'en_US' });
  const [videoFile, setVideoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const videoInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const loadShorts = async () => {
    setLoading(true);
    let q = supabase
      .from('shorts')
      .select('id,title,video_url,thumbnail_url,language')
      .order('created_at', { ascending: false });
    if (languageFilter) q = q.eq('language', languageFilter);
    const { data, error } = await q;
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadShorts();
  }, [languageFilter]);

  const uploadFile = async (bucket, path, file) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const create = async (e) => {
    e.preventDefault();
    setCreating(true);
    setUploadError('');

    try {
      let videoUrl = form.video_url;
      if (videoFile) {
        if (videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
          throw new Error(`Video exceeds ${MAX_VIDEO_MB}MB limit`);
        }
        const ext = videoFile.name.split('.').pop();
        const path = `shorts_${generatePath()}.${ext}`;
        videoUrl = await uploadFile('shorts', path, videoFile);
      }

      let thumbnailUrl = form.thumbnail_url;
      if (coverFile) {
        if (coverFile.size > MAX_COVER_MB * 1024 * 1024) {
          throw new Error(`Thumbnail exceeds ${MAX_COVER_MB}MB limit`);
        }
        const ext = coverFile.name.split('.').pop();
        const path = `short_covers_${generatePath()}.${ext}`;
        thumbnailUrl = await uploadFile('thumbnails', path, coverFile);
      }

      if (!videoUrl) {
        throw new Error('Please provide a video URL or upload a video file.');
      }

      const { data: inserted, error } = await supabase
        .from('shorts')
        .insert({
          title: form.title,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          language: form.language || 'en_US',
        })
        .select()
        .single();

      if (error) throw error;

      if (inserted) {
        setForm({ title: '', video_url: '', thumbnail_url: '', language: 'en_US' });
        setVideoFile(null);
        setCoverFile(null);
        if (videoInputRef.current) videoInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
        setList((prev) => [inserted, ...prev]);
      }
    } catch (err) {
      console.error('Error creating short:', err);
      setUploadError(err.message || 'Failed to upload files or create short.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this short?')) return;
    await supabase.from('shorts').delete().eq('id', id);
    setList((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Prarthana Shorts</h1>
        <p className="page-subtitle">Manage short vertical videos</p>
      </header>

      <div className="grid-2">
        <section className="card">
          <h2 className="card-title">Add Short Video</h2>
          <form onSubmit={create} className="form">
            <label>Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short title"
              required
            />
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Upload Video File <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Max {MAX_VIDEO_MB}MB)</span></label>
              <input 
                type="file" 
                accept="video/*" 
                ref={videoInputRef}
                onChange={(e) => setVideoFile(e.target.files[0])}
                style={{ marginBottom: '1rem', width: '100%' }}
              />
              <div style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>— OR —</div>
              <label>Video URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(if hosted externally)</span></label>
              <input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            
            <div style={{ background: 'var(--bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Upload Thumbnail <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(Max {MAX_COVER_MB}MB)</span></label>
              <input 
                type="file" 
                accept="image/*" 
                ref={coverInputRef}
                onChange={(e) => setCoverFile(e.target.files[0])}
                style={{ marginBottom: '1rem', width: '100%' }}
              />
              <div style={{ textAlign: 'center', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>— OR —</div>
              <label>Thumbnail URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(if hosted externally)</span></label>
              <input
                value={form.thumbnail_url}
                onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                placeholder="https://..."
              />
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
            {uploadError && <p className="error-msg">{uploadError}</p>}
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Uploading…' : 'Create Short'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All Shorts</h2>
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
            <p className="empty-state">No shorts yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Language</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => (
                    <tr key={s.id}>
                      <td className="mono">{s.id}</td>
                      <td>{s.title}</td>
                      <td><span className="badge">{LANGUAGES.find((l) => l.value === (s.language || 'en_US'))?.label || s.language || 'en'}</span></td>
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
