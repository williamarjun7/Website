import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { getAllSiteContent, updateSiteContent } from '../../services/contentService';

const FIELD_SCHEMAS: Record<string, z.ZodString> = {
  hero_title: z.string().min(2, 'Must be at least 2 characters').max(200),
  hero_subtitle: z.string().min(2, 'Must be at least 2 characters').max(300),
  about_text: z.string().min(10, 'Must be at least 10 characters').max(5000),
  contact_address: z.string().min(5, 'Must be at least 5 characters').max(500),
  contact_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/, 'Must be a valid phone number'),
  contact_email: z.string().email('Must be a valid email address'),
  footer_text: z.string().max(500),
};

const CONTENT_KEYS = [
  { key: 'hero_title', label: 'Hero Title', type: 'text' },
  { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'text' },
  { key: 'about_text', label: 'About Us Text', type: 'textarea' },
  { key: 'contact_address', label: 'Contact Address', type: 'text' },
  { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
  { key: 'contact_email', label: 'Contact Email', type: 'text' },
  { key: 'faq_questions', label: 'FAQ Questions (JSON)', type: 'textarea' },
  { key: 'footer_text', label: 'Footer Text', type: 'text' },
];

const ContentEditor = () => {
  const [contents, setContents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  const refreshContent = () => {
    setLoading(true);
    getAllSiteContent().then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        for (const item of data) {
          map[item.key] = item.value;
        }
        for (const c of CONTENT_KEYS) {
          if (!map[c.key]) map[c.key] = '';
        }
        setContents(map);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    getAllSiteContent().then(({ data }) => {
      if (!cancelled && data) {
        const map: Record<string, string> = {};
        for (const item of data) {
          map[item.key] = item.value;
        }
        for (const c of CONTENT_KEYS) {
          if (!map[c.key]) map[c.key] = '';
        }
        setContents(map);
      }
      if (!cancelled) setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSave = async (key: string) => {
    const value = contents[key] || '';

    if (key === 'faq_questions' && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
        for (const item of parsed) {
          if (!item.question || !item.answer) throw new Error('Each FAQ item must have question and answer fields');
        }
      } catch (e) {
        setToastMessage('FAQ JSON error: ' + (e instanceof Error ? e.message : 'Invalid JSON'));
        setTimeout(() => setToastMessage(''), 5000);
        return;
      }
    } else {
      const schema = FIELD_SCHEMAS[key];
      if (schema) {
        const result = schema.safeParse(value);
        if (!result.success) {
          setToastMessage(result.error.issues[0].message);
          setTimeout(() => setToastMessage(''), 5000);
          return;
        }
      }
    }

    setSaving(key);
    const { error } = await updateSiteContent(key, value);
    setSaving(null);
    if (error) {
      setToastMessage('Failed to save: ' + error);
    } else {
      setToastMessage('Saved successfully!');
    }
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in bg-green-50 text-green-700 border border-green-200" role="alert">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-gray-900">Content Editor</h1>
          <p className="text-gray-500">Manage text content across the website</p>
        </div>
        <button onClick={refreshContent} className="btn-secondary flex items-center space-x-2">
          <RefreshCw size={18} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="spinner" />
        </div>
      ) : (
        <div className="space-y-4">
          {CONTENT_KEYS.map((field) => (
            <div key={field.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  value={contents[field.key] || ''}
                  onChange={(e) => setContents(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="input w-full min-h-[120px] font-mono text-sm"
                  rows={6}
                />
              ) : (
                <input
                  type="text"
                  value={contents[field.key] || ''}
                  onChange={(e) => setContents(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="input w-full"
                />
              )}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => handleSave(field.key)}
                  disabled={saving === field.key}
                  className="btn-primary flex items-center space-x-2 text-sm px-4 py-2"
                >
                  {saving === field.key ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save size={16} />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentEditor;
