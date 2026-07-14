import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import * as jose from 'jose';

export default function Notifications() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form fields
  const [form, setForm] = useState({ title: '', body: '', imageUrl: '' });

  // Credentials config state
  const [showConfig, setShowConfig] = useState(false);
  const [serviceAccountInput, setServiceAccountInput] = useState(
    localStorage.getItem('fcm_service_account') || ''
  );
  const [isEnvConfigured, setIsEnvConfigured] = useState(false);

  // Check if environment variables are already configured
  useEffect(() => {
    const envProj = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const envEmail = import.meta.env.VITE_FIREBASE_CLIENT_EMAIL;
    const envKey = import.meta.env.VITE_FIREBASE_PRIVATE_KEY;
    if (envProj && envEmail && envKey) {
      setIsEnvConfigured(true);
    }
  }, []);

  const loadNotificationsHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, title, body, image_url, created_at')
      .order('created_at', { ascending: false });

    if (!error) {
      setList(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotificationsHistory();
  }, []);

  // Save manually pasted service account JSON to localStorage
  const saveConfig = (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (!serviceAccountInput.trim()) {
        localStorage.removeItem('fcm_service_account');
        setSuccessMsg('Credentials removed.');
        return;
      }
      // Validate JSON
      const parsed = JSON.parse(serviceAccountInput);
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        throw new Error('JSON is missing required fields (project_id, client_email, private_key).');
      }
      localStorage.setItem('fcm_service_account', serviceAccountInput);
      setSuccessMsg('Firebase Service Account configured successfully!');
      setShowConfig(false);
    } catch (err) {
      setErrorMsg('Invalid Service Account JSON: ' + err.message);
    }
  };

  // Helper to obtain credentials either from env or localStorage
  const getCredentials = () => {
    // 1. Check environment variables
    const envProj = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const envEmail = import.meta.env.VITE_FIREBASE_CLIENT_EMAIL;
    const envKey = import.meta.env.VITE_FIREBASE_PRIVATE_KEY;

    if (envProj && envEmail && envKey) {
      return {
        project_id: envProj,
        client_email: envEmail,
        private_key: envKey.replace(/\\n/g, '\n'),
      };
    }

    // 2. Check localStorage
    const saved = localStorage.getItem('fcm_service_account');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          project_id: parsed.project_id,
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, '\n'),
        };
      } catch (e) {
        return null;
      }
    }

    return null;
  };

  // Generate Google OAuth2 Token and push FCM notification
  const sendPushNotification = async (e) => {
    e.preventDefault();
    setSending(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const credentials = getCredentials();
      if (!credentials) {
        throw new Error(
          'Firebase credentials not found. Please paste your Service Account JSON under "Credentials Settings" or configure `.env` variables.'
        );
      }

      if (!form.title.trim() || !form.body.trim()) {
        throw new Error('Title and Body are required.');
      }

      // Generate Access Token using Web Crypto via jose package
      const jwt = await new jose.SignJWT({
        iss: credentials.client_email,
        sub: credentials.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
      })
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(await jose.importPKCS8(credentials.private_key, 'RS256'));

      // Exchange JWT for Access Token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error('Failed to fetch OAuth2 token from Google: ' + errText);
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Send the FCM Push Notification to topic "all"
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${credentials.project_id}/messages:send`;
      const payload = {
        message: {
          topic: 'all',
          notification: {
            title: form.title,
            body: form.body,
            ...(form.imageUrl.trim() ? { image: form.imageUrl.trim() } : {}),
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            title: form.title,
            body: form.body,
            ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
          },
          android: {
            notification: {
              channel_id: 'high_importance_channel',
              priority: 'high',
              sound: 'default',
            },
          },
        },
      };

      const pushRes = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!pushRes.ok) {
        const pushErrText = await pushRes.text();
        throw new Error('FCM push request failed: ' + pushErrText);
      }

      // Record to Supabase table
      const { data: inserted, error: sbError } = await supabase
        .from('notifications')
        .insert({
          title: form.title,
          body: form.body,
          image_url: form.imageUrl.trim() || null,
        })
        .select()
        .single();

      if (sbError) {
        console.warn('Notification sent via FCM, but database recording failed:', sbError);
      }

      setSuccessMsg('Notification sent successfully to all devices!');
      setForm({ title: '', body: '', imageUrl: '' });

      if (inserted) {
        setList((prev) => [inserted, ...prev]);
      } else {
        loadNotificationsHistory();
      }
    } catch (err) {
      console.error('Error pushing notification:', err);
      setErrorMsg(err.message || 'An error occurred while sending.');
    } finally {
      setSending(false);
    }
  };

  const deleteLog = async (id) => {
    if (!window.confirm('Delete this notification log from history? (This will not recall sent messages)')) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (!error) {
      setList((prev) => prev.filter((n) => n.id !== id));
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString() + ' ' + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasCredentials = isEnvConfigured || !!serviceAccountInput;

  return (
    <div className="page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Push Notifications</h1>
          <p className="page-subtitle">Send instant announcements directly to user devices</p>
        </div>
        <button
          type="button"
          onClick={() => setShowConfig(!showConfig)}
          className="btn"
          style={{
            background: 'rgba(255, 179, 0, 0.1)',
            color: 'var(--primary)',
            border: '1px solid var(--border)',
            padding: '0.6rem 1.2rem',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          ⚙️ Credentials Settings
        </button>
      </header>

      {/* Configuration Card */}
      {showConfig && (
        <section className="card" style={{ marginBottom: '2rem', border: '1px solid var(--primary)' }}>
          <h2 className="card-title">Firebase Credentials Config</h2>
          {isEnvConfigured ? (
            <div style={{ background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34D399', padding: '1rem', borderRadius: 'var(--radius-sm)', color: '#34D399', marginBottom: '1rem' }}>
              ✓ Firebase credentials detected in environment variables (`.env`). Local configuration is disabled.
            </div>
          ) : (
            <form onSubmit={saveConfig} className="form">
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Paste the contents of your Firebase Service Account private key JSON file. This JSON will be saved locally inside your browser's <code>localStorage</code>.
              </p>
              <textarea
                value={serviceAccountInput}
                onChange={(e) => setServiceAccountInput(e.target.value)}
                placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", ... }'
                rows={8}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  background: 'rgba(0,0,0,0.2)',
                  color: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px'
                }}
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">
                  Save Credentials
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setServiceAccountInput('');
                    localStorage.removeItem('fcm_service_account');
                    setSuccessMsg('Configuration cleared.');
                  }}
                  className="btn"
                  style={{ background: 'transparent', color: '#ff4444', border: '1px solid rgba(255,68,68,0.2)' }}
                >
                  Clear Config
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: 'var(--radius-sm)', color: '#ef4444', marginBottom: '1.5rem' }}>
          <strong>Error:</strong> {errorMsg}
        </div>
      )}

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '1rem', borderRadius: 'var(--radius-sm)', color: '#10b981', marginBottom: '1.5rem' }}>
          {successMsg}
        </div>
      )}

      <div className="grid-2">
        {/* Composing form */}
        <section className="card">
          <h2 className="card-title">Compose Push</h2>
          {!hasCredentials && (
            <div style={{ padding: '1.5rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', color: 'var(--text-muted)' }}>
              ⚠️ Credentials are not configured. Click on "Credentials Settings" to setup.
            </div>
          )}
          <form onSubmit={sendPushNotification} className="form" style={{ opacity: hasCredentials ? 1 : 0.5, pointerEvents: hasCredentials ? 'all' : 'none' }}>
            <label>Notification Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Daily Aarti Starting Soon!"
              required
            />

            <label>Message Body</label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="e.g. Join the evening Aarti live stream from Varanasi now."
              rows={4}
              required
              style={{
                width: '100%',
                background: 'var(--surface)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px',
                fontSize: '0.95rem'
              }}
            />

            <label>Image URL (Optional)</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://example.com/banner.jpg"
            />
            {form.imageUrl.trim() && (
              <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  style={{ maxHeight: '120px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={sending} style={{ marginTop: '1.5rem', width: '100%', padding: '0.8rem' }}>
              {sending ? 'Pushing Notification…' : '🚀 Push Notification to All Devices'}
            </button>
          </form>
        </section>

        {/* History of sent notifications */}
        <section className="card">
          <h2 className="card-title">Send History</h2>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : list.length === 0 ? (
            <p className="empty-state">No notifications pushed yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
              {list.map((item) => (
                <div key={item.id} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '1rem',
                  position: 'relative'
                }}>
                  <button
                    type="button"
                    onClick={() => deleteLog(item.id)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '10px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                    title="Delete record from log"
                  >
                    ✕
                  </button>
                  <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--primary)', paddingRight: '20px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.95rem', margin: '0.3rem 0', color: 'var(--text)' }}>
                    {item.body}
                  </div>
                  {item.image_url && (
                    <div style={{ margin: '0.5rem 0' }}>
                      <img src={item.image_url} alt="Notification Banner" style={{ maxHeight: '80px', borderRadius: '6px' }} />
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-hint)' }}>
                    Pushed: {formatDate(item.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
