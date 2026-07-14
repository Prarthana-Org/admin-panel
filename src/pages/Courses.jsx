import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

const VIDEO_BUCKET = 'videos';
const THUMBNAIL_BUCKET = 'thumbnails';
const MAX_VIDEO_MB = 500;
const MAX_THUMBNAIL_MB = 5;

function generatePath() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

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
  const [videoUploadError, setVideoUploadError] = useState('');
  const [uploadError, setUploadError] = useState('');
  
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const thumbnailInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
    if (thumbnailFile && thumbnailFile.size > MAX_THUMBNAIL_MB * 1024 * 1024) {
      setUploadError(`Thumbnail must be under ${MAX_THUMBNAIL_MB}MB`);
      return;
    }

    setCreating(true);
    try {
      let finalThumbnailUrl = form.thumbnail_url || null;

      if (thumbnailFile) {
        const ext = thumbnailFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `course-thumbnails/${generatePath()}.${ext}`;
        finalThumbnailUrl = await uploadFile(THUMBNAIL_BUCKET, path, thumbnailFile);
      }

      const { data: inserted, error } = await supabase
        .from('courses')
        .insert({
          title: form.title,
          description: form.description || null,
          author_name: form.author_name,
          course_type: form.course_type,
          thumbnail_url: finalThumbnailUrl,
          language: form.language || 'en_US',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setForm({ title: '', description: '', author_name: '', course_type: 'VIDEO', thumbnail_url: '', language: 'en_US' });
      setThumbnailFile(null);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
      setList((prev) => [inserted, ...prev]);
    } catch (err) {
      setUploadError(err?.message || 'Failed to create course');
    } finally {
      setCreating(false);
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
    setVideoUploadError('');

    if (!videoForm.video_url && !videoFile) {
      setVideoUploadError('Please select a video file or provide a URL.');
      return;
    }
    if (videoFile && videoFile.size > MAX_VIDEO_MB * 1024 * 1024) {
      setVideoUploadError(`Video must be under ${MAX_VIDEO_MB}MB`);
      return;
    }

    setVideoCreating(true);
    try {
      let finalVideoUrl = videoForm.video_url;

      if (videoFile) {
        const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const path = `course-videos/${generatePath()}.${ext}`;
        finalVideoUrl = await uploadFile(VIDEO_BUCKET, path, videoFile);
      }

      const { data: inserted, error } = await supabase
        .from('videos')
        .insert({
          course_id: selectedCourseId,
          title: videoForm.title || null,
          video_url: finalVideoUrl,
          episodenumber: parseInt(videoForm.episodenumber, 10) || 1,
        })
        .select()
        .single();

      if (error) throw error;

      setVideoForm({ title: '', video_url: '', episodenumber: videos.length + 1 });
      setVideoFile(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
      setVideos((prev) => [...prev, inserted].sort((a, b) => a.episodenumber - b.episodenumber));
    } catch (err) {
      setVideoUploadError(err?.message || 'Failed to add video');
    } finally {
      setVideoCreating(false);
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
            <label>Thumbnail Image <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional, max {MAX_THUMBNAIL_MB}MB)</span></label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
            />
            {thumbnailFile && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected: {thumbnailFile.name}</p>}
            <label>Thumbnail URL Fallback <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(if not uploading file)</span></label>
            <input
              value={form.thumbnail_url}
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
              placeholder="https://..."
            />
            {uploadError && <p className="error-msg">{uploadError}</p>}
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
            <label style={{ gridColumn: '1 / -1' }}>
              Video File <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional, max {MAX_VIDEO_MB}MB)</span>
              <input
                ref={videoInputRef}
                type="file"
                accept=".mp4,.mkv,.webm,.mov,video/mp4,video/webm,video/quicktime"
                onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                style={{ marginTop: '0.5rem' }}
              />
              {videoFile && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Selected: {videoFile.name}</p>}
            </label>
            <label>
              Video URL Fallback <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(if not uploading)</span>
              <input
                value={videoForm.video_url}
                onChange={(e) => setVideoForm({ ...videoForm, video_url: e.target.value })}
                placeholder="https://youtube.com/..."
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
            {videoUploadError && <p className="error-msg" style={{ gridColumn: '1 / -1' }}>{videoUploadError}</p>}
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
