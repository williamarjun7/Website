import { useState, useEffect } from 'react';
import { Save, Settings } from 'lucide-react';
import {
    getAllSettings,
    updateSetting,
    type SiteSetting
} from '../../services/settingsService';
import { addRevision } from '../../services/revisionService';
import Skeleton from '../../components/common/Skeleton';
import { PermissionButton } from '../../components/common/PermissionGuard';

const SiteSettings = () => {
    const [settings, setSettings] = useState<SiteSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [editValues, setEditValues] = useState<Record<string, string>>({});
    const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    useEffect(() => { loadSettings(); }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const { data } = await getAllSettings();
            if (data) {
                setSettings(data);
                const vals: Record<string, string> = {};
                for (const s of data) {
                    vals[s.key] = s.value;
                }
                setEditValues(vals);
            }
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
        setLoading(false);
    };

    const handleSave = async (key: string) => {
        setSavingKeys(prev => new Set(prev).add(key));
        const value = editValues[key] || '';
        const oldSetting = settings.find(s => s.key === key);
        const oldValue = oldSetting?.value || '';
        const { error } = await updateSetting(key, value);
        setSavingKeys(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
        });
        if (error) {
            showToast(error);
        } else {
            showToast(`Saved ${key}`);
            if (oldValue !== value) {
                await addRevision({ entity_type: 'site_settings', entity_id: key, field_name: 'value', old_value: oldValue, new_value: value, user_name: 'admin' });
            }
        }
    };

    const settingLabels: Record<string, string> = {
        site_name: 'Site Name',
        site_description: 'Site Description',
        contact_email: 'Contact Email',
        contact_phone: 'Contact Phone',
        address: 'Address',
        social_facebook: 'Facebook URL',
        social_twitter: 'Twitter URL',
        social_instagram: 'Instagram URL',
        social_youtube: 'YouTube URL',
        footer_text: 'Footer Text',
    };

    const priorityOrder = Object.keys(settingLabels);
    const sorted = [...settings].sort(
        (a, b) => {
            const ai = priorityOrder.indexOf(a.key);
            const bi = priorityOrder.indexOf(b.key);
            return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        }
    );

    return (
        <div className="space-y-6">
            {toast && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm bg-green-50 text-green-700 border border-green-200">
                    {toast}
                </div>
            )}

            <div>
                <h1 className="text-2xl font-bold font-heading text-gray-900">Site Settings</h1>
                <p className="text-gray-500">Manage global site configuration values</p>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex justify-between items-center">
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                                <Skeleton className="h-10 w-24 ml-4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : sorted.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                    <Settings className="mx-auto mb-3 text-gray-300" size={40} />
                    <p className="text-gray-400">No settings found.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map((setting) => {
                        const label = settingLabels[setting.key] || setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const saving = savingKeys.has(setting.key);
                        return (
                            <div key={setting.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:border-gray-200 transition-colors">
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {label}
                                    <span className="text-xs font-normal text-gray-400 ml-2 font-mono">({setting.key})</span>
                                </label>
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="text"
                                        value={editValues[setting.key] || ''}
                                        onChange={(e) => setEditValues(prev => ({ ...prev, [setting.key]: e.target.value }))}
                                        className="input flex-1"
                                        placeholder={label}
                                    />
                                    <PermissionButton resource="setting" action="update" onClick={() => handleSave(setting.key)} disabled={saving} className={`btn-primary whitespace-nowrap ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        {saving ? (
                                            <span className="flex items-center space-x-1">
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Saving</span>
                                            </span>
                                        ) : (
                                            <span className="flex items-center space-x-1">
                                                <Save size={16} />
                                                <span>Save</span>
                                            </span>
                                        )}
                                    </PermissionButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SiteSettings;
