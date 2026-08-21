import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const SUPPORTED_LOCALES = [
  { code: 'en_US', label: 'English' },
  { code: 'hi_IN', label: 'Hindi' },
  { code: 'ru_RU', label: 'Russian' },
  { code: 'ta_IN', label: 'Tamil' },
  { code: 'te_IN', label: 'Telugu' },
  { code: 'bn_IN', label: 'Bengali' },
  { code: 'gu_IN', label: 'Gujarati' },
];

export default function Translations() {
  const [translations, setTranslations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ key: '', translations: {} });
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    fetchTranslations();
  }, []);

  async function fetchTranslations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('app_translations')
      .select('*')
      .order('key');
      
    if (error) {
      console.error('Error fetching translations:', error);
      // Mock data if table doesn't exist yet
      setTranslations([
        { key: 'home', translations: { en_US: 'Home', hi_IN: 'होम' } }
      ]);
    } else {
      setTranslations(data || []);
    }
    setLoading(false);
  }

  function handleEdit(item) {
    setIsNew(false);
    setEditingId(item.key);
    setEditForm({
      key: item.key,
      translations: { ...item.translations }
    });
  }

  function handleAddNew() {
    setIsNew(true);
    setEditingId('new');
    setEditForm({
      key: '',
      translations: SUPPORTED_LOCALES.reduce((acc, loc) => ({ ...acc, [loc.code]: '' }), {})
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    const { key, translations: transMap } = editForm;
    if (!key) return alert('Key is required');

    if (isNew) {
      const { error } = await supabase
        .from('app_translations')
        .insert([{ key, translations: transMap }]);
      if (error) {
         console.error(error);
         alert('Error adding new key. (Did you run the SQL script?)');
      }
    } else {
      const { error } = await supabase
        .from('app_translations')
        .update({ translations: transMap })
        .eq('key', key);
      if (error) {
         console.error(error);
         alert('Error updating key. (Did you run the SQL script?)');
      }
    }

    setEditingId(null);
    fetchTranslations();
  }

  async function handleDelete(key) {
    if (!confirm('Are you sure you want to delete this translation key?')) return;
    const { error } = await supabase
      .from('app_translations')
      .delete()
      .eq('key', key);
      
    if (error) console.error(error);
    fetchTranslations();
  }

  if (loading) return <div>Loading translations...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2>App Translations</h2>
        <button className="primary" onClick={handleAddNew}>+ Add Translation</button>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Key</th>
              {SUPPORTED_LOCALES.map(loc => (
                <th key={loc.code}>{loc.label} ({loc.code})</th>
              ))}
              <th width="120">Actions</th>
            </tr>
          </thead>
          <tbody>
            {editingId === 'new' && (
              <tr>
                <td>
                  <input 
                    type="text" 
                    value={editForm.key} 
                    onChange={e => setEditForm({ ...editForm, key: e.target.value })} 
                    placeholder="e.g. welcome_message"
                  />
                </td>
                {SUPPORTED_LOCALES.map(loc => (
                  <td key={loc.code}>
                    <input 
                      type="text"
                      value={editForm.translations[loc.code] || ''}
                      onChange={e => setEditForm({
                        ...editForm,
                        translations: { ...editForm.translations, [loc.code]: e.target.value }
                      })}
                    />
                  </td>
                ))}
                <td>
                  <button className="primary small" onClick={handleSave}>Save</button>
                  <button className="small" onClick={() => setEditingId(null)} style={{ marginLeft: 5 }}>Cancel</button>
                </td>
              </tr>
            )}

            {translations.map(t => (
              <tr key={t.key}>
                {editingId === t.key ? (
                  <>
                    <td>{t.key}</td>
                    {SUPPORTED_LOCALES.map(loc => (
                      <td key={loc.code}>
                        <input 
                          type="text"
                          value={editForm.translations[loc.code] || ''}
                          onChange={e => setEditForm({
                            ...editForm,
                            translations: { ...editForm.translations, [loc.code]: e.target.value }
                          })}
                        />
                      </td>
                    ))}
                    <td>
                      <button className="primary small" onClick={handleSave}>Save</button>
                      <button className="small" onClick={() => setEditingId(null)} style={{ marginLeft: 5 }}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><strong>{t.key}</strong></td>
                    {SUPPORTED_LOCALES.map(loc => (
                      <td key={loc.code}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                           {t.translations?.[loc.code] || '-'}
                        </span>
                      </td>
                    ))}
                    <td>
                      <button className="small" onClick={() => handleEdit(t)}>Edit</button>
                      <button className="danger small" onClick={() => handleDelete(t.key)} style={{ marginLeft: 5 }}>Del</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
