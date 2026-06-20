import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import { getAllSiteContent, updateSiteContent } from '../../services/contentService';
import Skeleton from '../../components/common/Skeleton';

const FIELD_SCHEMAS: Record<string, z.ZodString> = {
  hero_title: z.string().min(2, 'Must be at least 2 characters').max(200),
  hero_subtitle: z.string().min(2, 'Must be at least 2 characters').max(300),
  about_text: z.string().min(10, 'Must be at least 10 characters').max(5000),
  contact_address: z.string().min(5, 'Must be at least 5 characters').max(500),
  contact_phone: z.string().regex(/^(\+?\d{1,3}[- ]?)?\d{7,15}$/, 'Must be a valid phone number'),
  contact_email: z.string().email('Must be a valid email address'),
  footer_text: z.string().max(500),
  home_feature_1_title: z.string().min(2).max(100),
  home_feature_1_desc: z.string().min(2).max(300),
  home_feature_2_title: z.string().min(2).max(100),
  home_feature_2_desc: z.string().min(2).max(300),
  home_feature_3_title: z.string().min(2).max(100),
  home_feature_3_desc: z.string().min(2).max(300),
  home_cta_title: z.string().min(2).max(200),
  home_cta_desc: z.string().min(2).max(300),
  home_cafe_title: z.string().min(2).max(200),
  home_cafe_desc: z.string().min(2).max(500),
  home_rooms_title: z.string().min(2).max(200),
  home_rooms_desc: z.string().min(2).max(300),
  about_hero_title: z.string().min(2).max(200),
  about_hero_subtitle: z.string().min(2).max(300),
  cafe_hero_title: z.string().min(2).max(200),
  cafe_hero_subtitle: z.string().min(2).max(300),
  cafe_description: z.string().min(2).max(2000),
  cafe_hours: z.string().min(2).max(200),
  checkin_time: z.string().min(1).max(50),
  checkout_time: z.string().min(1).max(50),
  cafe_hours_text: z.string().min(1).max(100),
  cancel_policy: z.string().min(2, 'Must be at least 2 characters').max(2000),
  about_story_title: z.string().min(2).max(200),
  about_story_text: z.string().min(10).max(10000),
  about_vision_title: z.string().min(2).max(200),
  about_vision_text: z.string().min(2).max(2000),
  about_quality_title: z.string().min(2).max(200),
  about_quality_text: z.string().min(2).max(2000),
  about_today_title: z.string().min(2).max(200),
  about_today_text: z.string().min(2).max(2000),
  about_mission: z.string().min(2).max(5000),
  about_values: z.string().min(2).max(10000),
  about_statistics: z.string().min(2).max(5000),
  about_commitment: z.string().min(2).max(5000),
  about_intro_subheading: z.string().min(2).max(500),
  home_cafe_bullets: z.string().min(2).max(2000),
  rooms_hero_title: z.string().min(2).max(200),
  rooms_hero_desc: z.string().min(2).max(500),
  rooms_section_label: z.string().min(2).max(100),
  gallery_heading: z.string().min(2).max(200),
  gallery_subtitle: z.string().min(2).max(500),
  gallery_filter_all: z.string().min(2).max(100),
  booking_sidebar_features: z.string().min(2).max(2000),
  location_section_content: z.string().min(2).max(2000),
  google_maps_url: z.string().min(2).max(1000),
  tiktok_embed_url: z.string().min(2).max(500),
  view_full_menu_image: z.string().min(2).max(500),
  faq_default_fallback: z.string().min(2).max(1000),
  navbar_phone: z.string().min(2).max(50),
  navbar_email: z.string().email().max(200),
  footer_social_facebook: z.string().min(2).max(500),
  footer_social_instagram: z.string().min(2).max(500),
  footer_social_whatsapp: z.string().min(2).max(500),
  footer_social_tiktok: z.string().min(2).max(500),
  footer_amenity_1_label: z.string().min(2).max(100),
  footer_amenity_2_label: z.string().min(2).max(100),
  footer_amenity_3_label: z.string().min(2).max(100),
  footer_amenity_4_label: z.string().min(2).max(100),
  footer_amenity_1_icon: z.string().min(2).max(50),
  footer_amenity_2_icon: z.string().min(2).max(50),
  footer_amenity_3_icon: z.string().min(2).max(50),
  footer_amenity_4_icon: z.string().min(2).max(50),
  terms_content: z.string().min(10).max(50000),
  privacy_content: z.string().min(10).max(50000),
  site_name: z.string().min(2).max(200),
  btn_book_stay: z.string().min(2).max(100),
  btn_book_now: z.string().min(2).max(100),
  btn_view_menu: z.string().min(2).max(100),
  btn_view_rooms: z.string().min(2).max(100),
  contact_heading: z.string().min(2).max(200),
  contact_subtitle: z.string().min(2).max(500),
  contact_form_heading: z.string().min(2).max(200),
  contact_form_text: z.string().min(2).max(500),
  contact_location_heading: z.string().min(2).max(200),
  contact_getting_here_title: z.string().min(2).max(200),
  contact_getting_here_text: z.string().min(2).max(2000),
  contact_location_assistance_heading: z.string().min(2).max(200),
  contact_location_assistance_text: z.string().min(2).max(2000),
  room_sidebar_feature_1: z.string().min(2).max(200),
  room_sidebar_feature_2: z.string().min(2).max(200),
  room_sidebar_feature_3: z.string().min(2).max(200),
  room_back_link: z.string().min(2).max(200),
  room_discover_heading: z.string().min(2).max(200),
  faq_hero_title: z.string().min(2).max(200),
  faq_hero_subtitle: z.string().min(2).max(500),
  room_no_credit_card_text: z.string().min(2).max(200),
  room_book_this_room: z.string().min(2).max(200),
  room_unavailable_maintenance: z.string().min(2).max(200),
  contact_phone_label: z.string().min(2).max(100),
  contact_email_label: z.string().min(2).max(100),
  contact_address_label: z.string().min(2).max(100),
  contact_checkinout_label: z.string().min(2).max(100),
  contact_cta_text: z.string().min(2).max(500),
  faq_cta_text: z.string().min(2).max(500),
  home_meta_title: z.string().min(2).max(200),
  home_meta_desc: z.string().min(2).max(400),
  contact_meta_title: z.string().min(2).max(200),
  contact_meta_desc: z.string().min(2).max(400),
  faq_meta_title: z.string().min(2).max(200),
  faq_meta_desc: z.string().min(2).max(400),
  rooms_meta_title: z.string().min(2).max(200),
  rooms_meta_desc: z.string().min(2).max(400),
  cafe_meta_title: z.string().min(2).max(200),
  cafe_meta_desc: z.string().min(2).max(400),
  about_meta_title: z.string().min(2).max(200),
  about_meta_desc: z.string().min(2).max(400),
  booking_meta_title: z.string().min(2).max(200),
  booking_meta_desc: z.string().min(2).max(400),
  gallery_meta_title: z.string().min(2).max(200),
  gallery_meta_desc: z.string().min(2).max(400),
  terms_meta_title: z.string().min(2).max(200),
  terms_meta_desc: z.string().min(2).max(400),
  privacy_meta_title: z.string().min(2).max(200),
  privacy_meta_desc: z.string().min(2).max(400),
};

const CONTENT_KEYS = [
  { key: 'hero_title', label: 'Hero Title', type: 'text' },
  { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'text' },
  { key: 'about_text', label: 'About Us Text', type: 'textarea' },
  { key: 'about_hero_title', label: 'About Hero Title', type: 'text' },
  { key: 'about_hero_subtitle', label: 'About Hero Subtitle', type: 'text' },
  { key: 'contact_address', label: 'Contact Address', type: 'text' },
  { key: 'contact_phone', label: 'Contact Phone', type: 'text' },
  { key: 'contact_email', label: 'Contact Email', type: 'text' },
  { key: 'faq_questions', label: 'FAQ Questions (JSON)', type: 'textarea' },
  { key: 'footer_text', label: 'Footer Text', type: 'text' },
  { key: 'home_feature_1_title', label: 'Home Feature 1 Title', type: 'text' },
  { key: 'home_feature_1_desc', label: 'Home Feature 1 Description', type: 'textarea' },
  { key: 'home_feature_2_title', label: 'Home Feature 2 Title', type: 'text' },
  { key: 'home_feature_2_desc', label: 'Home Feature 2 Description', type: 'textarea' },
  { key: 'home_feature_3_title', label: 'Home Feature 3 Title', type: 'text' },
  { key: 'home_feature_3_desc', label: 'Home Feature 3 Description', type: 'textarea' },
  { key: 'home_cta_title', label: 'Home CTA Title', type: 'text' },
  { key: 'home_cta_desc', label: 'Home CTA Description', type: 'textarea' },
  { key: 'home_cafe_title', label: 'Home Cafe Title', type: 'text' },
  { key: 'home_cafe_desc', label: 'Home Cafe Description', type: 'textarea' },
  { key: 'home_rooms_title', label: 'Home Rooms Title', type: 'text' },
  { key: 'home_rooms_desc', label: 'Home Rooms Description', type: 'textarea' },
  { key: 'cafe_hero_title', label: 'Cafe Hero Title', type: 'text' },
  { key: 'cafe_hero_subtitle', label: 'Cafe Hero Subtitle', type: 'text' },
  { key: 'cafe_description', label: 'Cafe Description', type: 'textarea' },
  { key: 'cafe_hours', label: 'Cafe Hours', type: 'text' },
  { key: 'checkin_time', label: 'Check-in Time', type: 'text' },
  { key: 'checkout_time', label: 'Check-out Time', type: 'text' },
  { key: 'cafe_hours_text', label: 'Cafe Hours Text', type: 'text' },
  { key: 'cancel_policy', label: 'Cancellation Policy', type: 'textarea' },
  { key: 'about_story_title', label: 'About — Story Title', type: 'text' },
  { key: 'about_story_text', label: 'About — Story Text', type: 'textarea' },
  { key: 'about_vision_title', label: 'About — Vision Title', type: 'text' },
  { key: 'about_vision_text', label: 'About — Vision Text', type: 'textarea' },
  { key: 'about_quality_title', label: 'About — Quality Title', type: 'text' },
  { key: 'about_quality_text', label: 'About — Quality Text', type: 'textarea' },
  { key: 'about_today_title', label: 'About — Today Title', type: 'text' },
  { key: 'about_today_text', label: 'About — Today Text', type: 'textarea' },
  { key: 'about_mission', label: 'About — Mission', type: 'textarea' },
  { key: 'about_values', label: 'About — Values (JSON)', type: 'textarea' },
  { key: 'about_statistics', label: 'About — Statistics (JSON)', type: 'textarea' },
  { key: 'about_commitment', label: 'About — Commitment', type: 'textarea' },
  { key: 'about_intro_subheading', label: 'About — Intro Subheading', type: 'text' },
  { key: 'home_cafe_bullets', label: 'Home Cafe Bullets (one per line)', type: 'textarea' },
  { key: 'rooms_hero_title', label: 'Rooms Hero Title', type: 'text' },
  { key: 'rooms_hero_desc', label: 'Rooms Hero Description', type: 'textarea' },
  { key: 'rooms_section_label', label: 'Rooms Section Label', type: 'text' },
  { key: 'gallery_heading', label: 'Gallery — Heading', type: 'text' },
  { key: 'gallery_subtitle', label: 'Gallery — Subtitle', type: 'text' },
  { key: 'gallery_filter_all', label: 'Gallery — Filter All Button', type: 'text' },
  { key: 'booking_sidebar_features', label: 'Booking Sidebar Features (one per line)', type: 'textarea' },
  { key: 'location_section_content', label: 'Location Section Content', type: 'textarea' },
  { key: 'google_maps_url', label: 'Google Maps Embed URL', type: 'text' },
  { key: 'tiktok_embed_url', label: 'TikTok Embed URL', type: 'text' },
  { key: 'view_full_menu_image', label: 'View Full Menu Image URL', type: 'text' },
  { key: 'faq_default_fallback', label: 'FAQ Default Fallback Message', type: 'textarea' },
  { key: 'navbar_phone', label: 'Navbar Phone Number', type: 'text' },
  { key: 'navbar_email', label: 'Navbar Email', type: 'text' },
  { key: 'footer_social_facebook', label: 'Footer Social — Facebook URL', type: 'text' },
  { key: 'footer_social_instagram', label: 'Footer Social — Instagram URL', type: 'text' },
  { key: 'footer_social_whatsapp', label: 'Footer Social — WhatsApp URL', type: 'text' },
  { key: 'footer_social_tiktok', label: 'Footer Social — TikTok URL', type: 'text' },
  { key: 'footer_amenity_1_label', label: 'Footer Amenity 1 Label', type: 'text' },
  { key: 'footer_amenity_2_label', label: 'Footer Amenity 2 Label', type: 'text' },
  { key: 'footer_amenity_3_label', label: 'Footer Amenity 3 Label', type: 'text' },
  { key: 'footer_amenity_4_label', label: 'Footer Amenity 4 Label', type: 'text' },
  { key: 'footer_amenity_1_icon', label: 'Footer Amenity 1 Icon (Lucide name)', type: 'text' },
  { key: 'footer_amenity_2_icon', label: 'Footer Amenity 2 Icon (Lucide name)', type: 'text' },
  { key: 'footer_amenity_3_icon', label: 'Footer Amenity 3 Icon (Lucide name)', type: 'text' },
  { key: 'footer_amenity_4_icon', label: 'Footer Amenity 4 Icon (Lucide name)', type: 'text' },
  { key: 'terms_content', label: 'Terms & Conditions Content', type: 'textarea' },
  { key: 'privacy_content', label: 'Privacy Policy Content', type: 'textarea' },
  { key: 'site_name', label: 'Site Name', type: 'text' },
  { key: 'btn_book_stay', label: 'Button — Book Your Stay', type: 'text' },
  { key: 'btn_book_now', label: 'Button — Book Now', type: 'text' },
  { key: 'btn_view_menu', label: 'Button — View Menu', type: 'text' },
  { key: 'btn_view_rooms', label: 'Button — View All Rooms', type: 'text' },
  { key: 'contact_heading', label: 'Contact — Page Heading', type: 'text' },
  { key: 'contact_subtitle', label: 'Contact — Page Subtitle', type: 'textarea' },
  { key: 'contact_form_heading', label: 'Contact — Form Heading', type: 'text' },
  { key: 'contact_form_text', label: 'Contact — Form Description', type: 'textarea' },
  { key: 'contact_location_heading', label: 'Contact — Location Heading', type: 'text' },
  { key: 'contact_getting_here_title', label: 'Contact — Getting Here Title', type: 'text' },
  { key: 'contact_getting_here_text', label: 'Contact — Getting Here Text', type: 'textarea' },
  { key: 'contact_location_assistance_heading', label: 'Contact — Location Assistance Heading', type: 'text' },
  { key: 'contact_location_assistance_text', label: 'Contact — Location Assistance Text', type: 'textarea' },
  { key: 'contact_phone_label', label: 'Contact — Phone Section Label', type: 'text' },
  { key: 'contact_email_label', label: 'Contact — Email Section Label', type: 'text' },
  { key: 'contact_address_label', label: 'Contact — Address Section Label', type: 'text' },
  { key: 'contact_checkinout_label', label: 'Contact — Check-in/out Section Label', type: 'text' },
  { key: 'contact_cta_text', label: 'Contact — CTA Text', type: 'text' },
  { key: 'room_sidebar_feature_1', label: 'Room — Sidebar Feature 1', type: 'text' },
  { key: 'room_sidebar_feature_2', label: 'Room — Sidebar Feature 2', type: 'text' },
  { key: 'room_sidebar_feature_3', label: 'Room — Sidebar Feature 3', type: 'text' },
  { key: 'room_back_link', label: 'Room — Back Link Text', type: 'text' },
  { key: 'room_discover_heading', label: 'Room — Discover Other Rooms Heading', type: 'text' },
  { key: 'room_book_this_room', label: 'Room — Book This Room Button', type: 'text' },
  { key: 'room_no_credit_card_text', label: 'Room — No Credit Card Notice', type: 'text' },
  { key: 'room_unavailable_maintenance', label: 'Room — Maintenance Notice', type: 'text' },
  { key: 'faq_hero_title', label: 'FAQ — Hero Title', type: 'text' },
  { key: 'faq_hero_subtitle', label: 'FAQ — Hero Subtitle', type: 'textarea' },
  { key: 'faq_cta_text', label: 'FAQ — CTA Text', type: 'text' },
  { key: 'home_meta_title', label: 'SEO — Home Meta Title', type: 'text' },
  { key: 'home_meta_desc', label: 'SEO — Home Meta Description', type: 'textarea' },
  { key: 'contact_meta_title', label: 'SEO — Contact Meta Title', type: 'text' },
  { key: 'contact_meta_desc', label: 'SEO — Contact Meta Description', type: 'textarea' },
  { key: 'faq_meta_title', label: 'SEO — FAQ Meta Title', type: 'text' },
  { key: 'faq_meta_desc', label: 'SEO — FAQ Meta Description', type: 'textarea' },
  { key: 'rooms_meta_title', label: 'SEO — Rooms Meta Title', type: 'text' },
  { key: 'rooms_meta_desc', label: 'SEO — Rooms Meta Description', type: 'textarea' },
  { key: 'cafe_meta_title', label: 'SEO — Cafe Meta Title', type: 'text' },
  { key: 'cafe_meta_desc', label: 'SEO — Cafe Meta Description', type: 'textarea' },
  { key: 'about_meta_title', label: 'SEO — About Meta Title', type: 'text' },
  { key: 'about_meta_desc', label: 'SEO — About Meta Description', type: 'textarea' },
  { key: 'booking_meta_title', label: 'SEO — Booking Meta Title', type: 'text' },
  { key: 'booking_meta_desc', label: 'SEO — Booking Meta Description', type: 'textarea' },
  { key: 'gallery_meta_title', label: 'SEO — Gallery Meta Title', type: 'text' },
  { key: 'gallery_meta_desc', label: 'SEO — Gallery Meta Description', type: 'textarea' },
  { key: 'terms_meta_title', label: 'SEO — Terms Meta Title', type: 'text' },
  { key: 'terms_meta_desc', label: 'SEO — Terms Meta Description', type: 'textarea' },
  { key: 'privacy_meta_title', label: 'SEO — Privacy Meta Title', type: 'text' },
  { key: 'privacy_meta_desc', label: 'SEO — Privacy Meta Description', type: 'textarea' },
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
        <div className="space-y-4">
          {CONTENT_KEYS.map((field) => (
            <div key={field.key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
              <Skeleton className="h-4 w-40" />
              {field.type === 'textarea' ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <Skeleton className="h-10 w-full" />
              )}
              <div className="flex justify-end">
                <Skeleton className="h-9 w-20 rounded-lg" />
              </div>
            </div>
          ))}
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
