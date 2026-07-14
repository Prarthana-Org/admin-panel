import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AUDIO_BUCKET = 'audios';
const COVER_BUCKET = 'audio-covers';
const MAX_AUDIO_MB = 50;
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

export default function Audios() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [form, setForm] = useState({ title: '', artist: '', image_url: '', language: 'en_US' });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const loadAudios = async () => {
    setLoading(true);
    let q = supabase
      .from('audios')
      .select('id,title,artist,audio_url,image_url,language')
      .order('created_at', { ascending: false });
    if (languageFilter) q = q.eq('language', languageFilter);
    const { data, error } = await q;
    if (!error) setList(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAudios();
  }, [languageFilter]);

  const uploadFile = async (bucket, path, file) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const create = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!audioFile) {
      setUploadError('Please select an audio file (MP3, WAV, OGG, etc.)');
      return;
    }
    if (audioFile.size > MAX_AUDIO_MB * 1024 * 1024) {
      setUploadError(`Audio file must be under ${MAX_AUDIO_MB}MB`);
      return;
    }
    if (coverFile && coverFile.size > MAX_COVER_MB * 1024 * 1024) {
      setUploadError(`Cover image must be under ${MAX_COVER_MB}MB`);
      return;
    }
    setCreating(true);
    try {
      const base = generatePath();
      const audioExt = audioFile.name.split('.').pop()?.toLowerCase() || 'mp3';
      const audioPath = `audio/${base}.${audioExt}`;
      const audioUrl = await uploadFile(AUDIO_BUCKET, audioPath, audioFile);

      let imageUrl = form.image_url || null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const coverPath = `covers/${base}.${coverExt}`;
        imageUrl = await uploadFile(COVER_BUCKET, coverPath, coverFile);
      }

      const { data: inserted, error } = await supabase
        .from('audios')
        .insert({
          title: form.title,
          artist: form.artist,
          audio_url: audioUrl,
          image_url: imageUrl,
          language: form.language || 'en_US',
        })
        .select()
        .single();

      if (!error && inserted) {
        setForm({ title: '', artist: '', image_url: '', language: 'en_US' });
        setAudioFile(null);
        setCoverFile(null);
        if (audioInputRef.current) audioInputRef.current.value = '';
        if (coverInputRef.current) coverInputRef.current.value = '';
        setList((prev) => [inserted, ...prev]);
      } else {
        setUploadError(error?.message || 'Failed to save audio');
      }
    } catch (err) {
      setUploadError(err?.message || 'Upload failed. Check storage bucket exists and you are logged in.');
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this audio?')) return;
    await supabase.from('audios').delete().eq('id', id);
    setList((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Audios</h1>
        <p className="page-subtitle">Chants and audio content — upload files like Spotify</p>
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
            <label>Audio file <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(MP3, WAV, OGG — max {MAX_AUDIO_MB}MB)</span></label>
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,.wav,.ogg,.m4a,.aac,.mp4,audio/mpeg,audio/wav,audio/ogg,audio/aac,audio/x-m4a,audio/mp4"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              required
            />
            {audioFile && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected: {audioFile.name}</p>}
            <label>Cover image <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional, max {MAX_COVER_MB}MB)</span></label>
            <input
              ref={coverInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
            />
            {coverFile && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected: {coverFile.name}</p>}
            <label>Image URL <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(or leave blank if uploading cover)</span></label>
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://... (optional fallback)"
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
            {uploadError && <p className="error-msg">{uploadError}</p>}
            <button type="submit" className="btn btn-primary" disabled={creating} style={{ marginTop: '1rem' }}>
              {creating ? 'Uploading…' : 'Create audio'}
            </button>
          </form>
        </section>

        <section className="card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 className="card-title" style={{ margin: 0 }}>All audios</h2>
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
            <p className="empty-state">No audios yet. Add one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Language</th>
                    <th>Artist</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr key={a.id}>
                      <td className="mono">{a.id}</td>
                      <td>{a.title}</td>
                      <td><span className="badge">{LANGUAGES.find((l) => l.value === (a.language || 'en_US'))?.label || a.language || 'en'}</span></td>
                      <td>{a.artist}</td>
                      <td>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(a.id)}>
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
