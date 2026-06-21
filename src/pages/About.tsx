import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Coffee, Heart, Award, CheckCircle, Star, Wifi, Car, Clock, Shield, Users, BookOpen, Sun, Moon, Mountain, TreePine, UtensilsCrossed, Smile } from 'lucide-react';
import { getSiteImagesByPage, getSiteContentMap } from '../services/contentService';
import { getPageBySlug } from '../services/pageService';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Heart, Award, Coffee, MapPin, Star, CheckCircle,
  Wifi, Car, Clock, Shield, Users, BookOpen, Sun, Moon,
  Mountain, TreePine, UtensilsCrossed, Smile,
};

const resolveIcon = (name: string) => ICON_MAP[name] || Heart;

interface ValueItem {
  icon?: string;
  title?: string;
  description?: string;
}

interface StatItem {
  number?: string;
  label?: string;
}

const parseJSON = <T,>(jsonStr: string, fallback: T): T => {
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed as T : fallback;
  } catch {
    return fallback;
  }
};

const About = () => {
  const [activeTab, setActiveTab] = useState('story');
  const [heroBg, setHeroBg] = useState('');
  const [content, setContent] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getSiteImagesByPage('about'),
      getSiteContentMap(),
      getPageBySlug('about'),
    ]).then(([imgRes, contentRes, pageRes]) => {
      if (imgRes.data && imgRes.data.length > 0) {
        setHeroBg(imgRes.data[0].image_url);
      }
      if (pageRes.data && pageRes.data.featured_image) {
        setHeroBg(pageRes.data.featured_image);
      }
      if (contentRes.data) setContent(contentRes.data);
    }).catch(() => {});
  }, []);

  const C = (key: string, fallback: string) => { const v = content[key]; return v && v.replace(/<[^>]*>/g, '').trim() ? v : fallback; };

  const values = parseJSON<ValueItem[]>(C('about_values', '[]'), [
    { icon: 'Heart', title: 'Hospitality First', description: 'Every guest is family. We go above and beyond to ensure your stay is comfortable and memorable.' },
    { icon: 'Coffee', title: 'Authentic Experiences', description: 'From our locally-sourced ingredients to traditional recipes, we celebrate Nepali culture.' },
    { icon: 'Award', title: 'Excellence in Service', description: 'Continuous training and improvement to deliver world-class hospitality in the highlands.' },
    { icon: 'MapPin', title: 'Sustainable Tourism', description: 'Committed to preserving our environment and supporting local communities.' },
  ]);

  const statistics = parseJSON<StatItem[]>(C('about_statistics', '[]'), [
    { number: '100%', label: 'Guest Satisfaction' },
    { number: 'Newly', label: 'Opened & Ready' },
    { number: '24/7', label: 'Care & Support' },
    { number: 'Premium', label: 'Local Comfort' },
  ]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Helmet>
        <title>{C('about_meta_title', 'About Us | Highlands Motel & Cafe')}</title>
        <meta name="description" content={C('about_meta_desc', C('about_intro_subheading', 'Learn the story behind Highlands Motel & Cafe in Surkhet.'))} />
      </Helmet>

      <section className="relative h-80 mb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-900 to-orange-900">
          <img
            src={heroBg}
            alt={C('site_name', 'Highlands Cafe & Motel Inn')}
            className="w-full h-full object-cover opacity-40"
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="container-custom text-center text-white">
            <Heart className="mx-auto mb-4" size={48} />
            <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">
              {C('about_hero_title', 'Our Story')}
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {C('about_hero_subtitle', 'Discover the passion behind Highlands Cafe & Motel Inn')}
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom max-w-6xl">
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-xl shadow-lg p-2 inline-flex space-x-2">
            {[
              { id: 'story', label: C('about_tab_story_label', 'Our Story'), icon: Heart },
              { id: 'mission', label: C('about_mission_heading', 'Mission & Values'), icon: Award },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'story' && (
          <div className="space-y-16">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="font-heading text-3xl font-bold mb-6 text-amber-900">
                {C('about_story_title', 'From Humble Beginnings to Highland Excellence')}
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                {C('about_story_text', 'Founded with a vision to redefine hospitality in the Karnali region, Highlands Cafe & Motel Inn is the newest destination for travelers seeking authentic comfort and breathtaking views.')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
                <div className="text-center">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart size={32} className="text-amber-700" />
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">{C('about_vision_title', 'The Vision')}</h3>
                  <p className="text-gray-600">{C('about_vision_text', 'Conceived to bring premium boutique hospitality to the Surkhet valley')}</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award size={32} className="text-amber-700" />
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">{C('about_quality_title', 'The Quality')}</h3>
                  <p className="text-gray-600">{C('about_quality_text', 'Built with attention to detail and a commitment to guest comfort')}</p>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star size={32} className="text-amber-700" />
                  </div>
                  <h3 className="font-heading font-bold text-xl mb-2">{C('about_today_title', 'Today')}</h3>
                  <p className="text-gray-600">{C('about_today_text', 'Open and ready to welcome guests with unmatched local warmth')}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-12">
              <div className="flex items-center justify-center mb-6">
                <MapPin size={40} className="text-amber-700 mr-4" />
                <h3 className="font-heading text-2xl font-bold text-amber-900">{C('about_position_heading', 'Perfectly Positioned')}</h3>
              </div>
              <p className="text-gray-700 text-center max-w-3xl mx-auto leading-relaxed">
                {C('location_section_content', 'Nestled in the Khajura region of Birendranagar-07, Surkhet, our location offers the perfect blend of accessibility and serenity.')}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'mission' && (
          <div className="space-y-16">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="font-heading text-3xl font-bold mb-6 text-amber-900">
                {C('about_mission_heading', 'Our Mission & Values')}
              </h2>
              <p className="text-xl text-gray-700 leading-relaxed mb-12 italic">
                {C('about_mission', '"To create unforgettable experiences through exceptional hospitality, authentic cuisine, and genuine connection to our Himalayan heritage."')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((value, index) => {
                const Icon = resolveIcon(value.icon || 'Heart');
                return (
                  <div key={index} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-amber-100 rounded-lg">
                        <Icon size={24} className="text-amber-700" />
                      </div>
                      <div>
                        <h3 className="font-heading text-xl font-bold mb-3 text-gray-800">
                          {value.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {value.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-12 text-center">
              <h3 className="font-heading text-2xl font-bold mb-4">{C('about_commitment_heading', 'Our Commitment')}</h3>
              <p className="text-lg mb-8 max-w-3xl mx-auto">
                {C('about_commitment', 'We are dedicated to creating a space where travelers can rest, recharge, and reconnect with nature and themselves.')}
              </p>
              <div className="flex justify-center space-x-8">
                {C('about_commitment_items', 'Quality, Comfort, Authenticity, Sustainability').split(',').map((item) => (
                  <div key={item.trim()} className="text-center">
                    <CheckCircle size={32} className="mx-auto mb-2 text-amber-300" />
                    <span className="font-semibold">{item.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <section className="mt-20 bg-gradient-to-r from-amber-900 to-orange-900 text-white rounded-2xl p-12">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold mb-4">{C('about_stats_heading', 'Highlands by Numbers')}</h2>
            <p className="text-amber-100 text-lg">{C('about_intro_subheading', 'Our commitment to excellence speaks for itself')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statistics.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold mb-2 text-amber-200">
                  {stat.number}
                </div>
                <div className="text-amber-100">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;
