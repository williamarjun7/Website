import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Save, RefreshCw, ChevronDown, ChevronRight, Image, FileText, Settings, Eye, Phone, Home, Info, BookOpen, Layout, Camera, Coffee } from 'lucide-react';
import { getAllSiteContent, updateSiteContent } from '../../services/contentService';
import { CONTENT_DEFAULTS } from '../../services/contentDefaults';
import Skeleton from '../../components/common/Skeleton';
import RichTextEditor from '../../components/admin/RichTextEditor';
import MediaPicker from '../../components/admin/MediaPicker';

interface FieldDef {
    label: string;
    type: 'text' | 'textarea' | 'richtext' | 'json' | 'image';
    description?: string;
    section: string;
}

interface SectionGroup {
    label: string;
    sections: { id: string; label: string; fields: string[] }[];
}

interface PageConfig {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    groups: SectionGroup[];
}

const pagesConfig: PageConfig[] = [
    {
        id: 'home', label: 'Home', icon: Home,
        groups: [{
            label: 'Home Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['hero_title', 'hero_subtitle', 'hero_video_url'] },
                { id: 'features', label: 'Features Section', fields: ['home_feature_1_title', 'home_feature_1_desc', 'home_feature_2_title', 'home_feature_2_desc', 'home_feature_3_title', 'home_feature_3_desc'] },
                { id: 'rooms', label: 'Rooms Section', fields: ['home_rooms_title', 'home_rooms_desc'] },
                { id: 'cafe', label: 'Cafe Highlight Section', fields: ['home_cafe_title', 'home_cafe_desc', 'home_cafe_bullets'] },
                { id: 'reviews', label: 'Reviews Section', fields: ['home_reviews_title', 'home_reviews_subtitle'] },
                { id: 'cta', label: 'CTA Section', fields: ['home_cta_title', 'home_cta_desc'] },
            ]
        }]
    },
    {
        id: 'about', label: 'About', icon: Info,
        groups: [{
            label: 'About Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['about_hero_title', 'about_hero_subtitle'] },
                { id: 'tabs', label: 'Tab Navigation', fields: ['about_tab_story_label', 'about_tab_mission_label'] },
                { id: 'story', label: 'Story Section', fields: ['about_story_title', 'about_story_text', 'about_vision_title', 'about_vision_text', 'about_quality_title', 'about_quality_text', 'about_today_title', 'about_today_text'] },
                { id: 'position', label: 'Location Section', fields: ['about_position_heading', 'location_section_content'] },
                { id: 'mission', label: 'Mission & Values', fields: ['about_mission_heading', 'about_mission', 'about_values'] },
                { id: 'commitment', label: 'Commitment Section', fields: ['about_commitment_heading', 'about_commitment', 'about_commitment_items'] },
                { id: 'stats', label: 'Statistics Section', fields: ['about_stats_heading', 'about_intro_subheading', 'about_statistics'] },
            ]
        }]
    },
    {
        id: 'contact', label: 'Contact', icon: Phone,
        groups: [{
            label: 'Contact Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['contact_heading', 'contact_subtitle'] },
                { id: 'info', label: 'Contact Information', fields: ['contact_phone_label', 'contact_phone', 'contact_phone_note', 'contact_email_label', 'contact_email', 'contact_email_note', 'contact_address_label', 'contact_address', 'contact_checkinout_label', 'contact_checkinout_note'] },
                { id: 'form', label: 'Contact Form', fields: ['contact_form_heading', 'contact_form_text', 'contact_form_thank_you', 'contact_form_thank_you_note'] },
                { id: 'map', label: 'Map Section', fields: ['contact_location_heading', 'google_maps_url', 'contact_getting_here_title', 'contact_getting_here_text'] },
                { id: 'assistance', label: 'Location Assistance', fields: ['contact_location_assistance_heading', 'contact_location_assistance_text', 'tiktok_embed_url'] },
                { id: 'cta', label: 'CTA Section', fields: ['contact_cta_text'] },
            ]
        }]
    },
    {
        id: 'cafe', label: 'Cafe', icon: Coffee,
        groups: [{
            label: 'Cafe Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['cafe_hero_title', 'cafe_hero_subtitle', 'cafe_hero_btn_reserve', 'cafe_hero_btn_menu'] },
                { id: 'description', label: 'Description Section', fields: ['cafe_description', 'cafe_hours'] },
                { id: 'menu', label: 'Menu Section', fields: ['cafe_featured_heading', 'cafe_full_menu_heading', 'cafe_featured_empty', 'cafe_menu_empty', 'cafe_view_full_menu_btn', 'cafe_menu_card_text'] },
                { id: 'cta', label: 'CTA Section', fields: ['cafe_cta_heading', 'cafe_cta_text', 'cafe_cta_btn_reserve', 'cafe_cta_btn_room'] },
            ]
        }]
    },
    {
        id: 'rooms', label: 'Rooms', icon: BookOpen,
        groups: [{
            label: 'Rooms Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['rooms_section_label', 'rooms_hero_title', 'rooms_hero_desc'] },
                { id: 'search', label: 'Search & Filters', fields: ['rooms_search_placeholder', 'rooms_filter_btn', 'rooms_filter_heading', 'rooms_filter_ac_label', 'rooms_filter_ac_all', 'rooms_filter_ac_ac', 'rooms_filter_ac_nonac', 'rooms_filter_type_label', 'rooms_filter_type_all', 'rooms_filter_type_single', 'rooms_filter_type_double', 'rooms_filter_min_price', 'rooms_filter_max_price', 'rooms_filter_clear', 'rooms_no_results', 'rooms_no_rooms', 'rooms_count_found', 'rooms_view_details'] },
                { id: 'labels', label: 'Room Card Labels', fields: ['rooms_label_guests', 'rooms_label_people', 'rooms_label_bed', 'rooms_label_night', 'rooms_label_npr', 'rooms_label_book', 'rooms_label_unavailable', 'rooms_label_floor', 'rooms_label_featured', 'rooms_label_limited', 'rooms_label_booked', 'rooms_label_maintenance', 'rooms_label_more', 'rooms_label_ac', 'rooms_label_nonac', 'rooms_type_fallback', 'rooms_bed_fallback'] },
            ]
        }]
    },
    {
        id: 'roomdetails', label: 'Room Details', icon: Layout,
        groups: [{
            label: 'Room Details Page',
            sections: [
                { id: 'headings', label: 'Section Headings', fields: ['roomdetails_desc_heading', 'roomdetails_amenities_heading', 'roomdetails_policies_heading', 'roomdetails_reviews_heading', 'roomdetails_reserve_heading', 'roomdetails_type_fallback', 'roomdetails_room_number_label', 'roomdetails_floor_label', 'roomdetails_no_ac_label', 'roomdetails_ac_label'] },
                { id: 'stats', label: 'Room Stats Labels', fields: ['roomdetails_capacity_label', 'roomdetails_size_label', 'roomdetails_bedtype_label', 'roomdetails_availability_label', 'roomdetails_per_night', 'roomdetails_guests_suffix'] },
                { id: 'policies', label: 'Policies Section', fields: ['roomdetails_checkin_heading', 'roomdetails_cancel_heading', 'roomdetails_checkin_text', 'roomdetails_cancel_text'] },
                { id: 'sidebar', label: 'Sidebar Features', fields: ['room_sidebar_feature_1', 'room_sidebar_feature_2', 'room_sidebar_feature_3', 'room_back_link', 'room_discover_heading', 'room_book_this_room', 'room_no_credit_card_text', 'room_unavailable_maintenance'] },
                { id: 'empty', label: 'Empty States', fields: ['roomdetails_no_reviews_heading', 'roomdetails_no_reviews_text', 'roomdetails_amenity_fallback'] },
            ]
        }]
    },
    {
        id: 'gallery', label: 'Gallery', icon: Camera,
        groups: [{
            label: 'Gallery Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['gallery_heading', 'gallery_subtitle'] },
                { id: 'filters', label: 'Filter Buttons', fields: ['gallery_filter_all', 'gallery_filter_gallery', 'gallery_filter_exterior', 'gallery_filter_other'] },
                { id: 'empty', label: 'Empty State', fields: ['gallery_empty_heading', 'gallery_empty_text'] },
            ]
        }]
    },
    {
        id: 'privacy', label: 'Privacy', icon: FileText,
        groups: [{
            label: 'Privacy Policy Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['privacy_hero_heading', 'privacy_hero_subtitle', 'privacy_last_updated_label'] },
                { id: 'content', label: 'Page Content', fields: ['privacy_content'] },
                { id: 'cta', label: 'CTA Section', fields: ['privacy_cta_heading', 'privacy_cta_text', 'privacy_cta_btn_book', 'privacy_cta_btn_contact'] },
            ]
        }]
    },
    {
        id: 'terms', label: 'Terms', icon: FileText,
        groups: [{
            label: 'Terms of Service Page',
            sections: [
                { id: 'hero', label: 'Hero Section', fields: ['terms_hero_heading', 'terms_hero_subtitle', 'terms_last_updated_label'] },
                { id: 'content', label: 'Page Content', fields: ['terms_content'] },
                { id: 'cta', label: 'CTA Section', fields: ['terms_cta_heading', 'terms_cta_text', 'terms_cta_btn_book', 'terms_cta_btn_contact'] },
            ]
        }]
    },
    {
        id: 'global', label: 'Global', icon: Settings,
        groups: [
            {
                label: 'Navbar', sections: [
                    { id: 'navbar', label: 'Navbar Content', fields: ['site_name', 'navbar_phone', 'navbar_email', 'logo_url'] },
                ]
            },
            {
                label: 'Footer', sections: [
                    { id: 'footer', label: 'Footer Content', fields: ['footer_text', 'footer_quicklinks_heading', 'footer_getintouch_heading', 'footer_connect_heading', 'footer_operating_hours_heading', 'footer_premium_label', 'footer_phone_sublabel', 'footer_email_sublabel', 'footer_location_sublabel', 'footer_rights', 'footer_made_with'] },
                    { id: 'social', label: 'Social Links', fields: ['footer_social_facebook', 'footer_social_instagram', 'footer_social_whatsapp', 'footer_social_tiktok'] },
                    { id: 'amenities', label: 'Amenities', fields: ['footer_amenity_1_label', 'footer_amenity_1_icon', 'footer_amenity_2_label', 'footer_amenity_2_icon', 'footer_amenity_3_label', 'footer_amenity_3_icon', 'footer_amenity_4_label', 'footer_amenity_4_icon'] },
                    { id: 'bottom', label: 'Bottom Bar', fields: ['footer_bottom_privacy', 'footer_bottom_terms'] },
                    { id: 'hours', label: 'Operating Hours Labels', fields: ['footer_hours_checkin_label', 'footer_hours_checkout_label', 'footer_hours_cafe_label', 'checkin_time', 'checkout_time', 'cafe_hours_text'] },
                ]
            },
            {
                label: 'Buttons', sections: [
                    { id: 'buttons', label: 'Button Labels', fields: ['btn_book_stay', 'btn_book_now', 'btn_view_menu', 'btn_view_rooms'] },
                ]
            },
        ]
    },
    {
        id: 'seo', label: 'SEO', icon: Eye,
        groups: [{
            label: 'SEO Meta Tags',
            sections: [
                { id: 'home', label: 'Home Page SEO', fields: ['home_meta_title', 'home_meta_desc'] },
                { id: 'about', label: 'About Page SEO', fields: ['about_meta_title', 'about_meta_desc'] },
                { id: 'contact', label: 'Contact Page SEO', fields: ['contact_meta_title', 'contact_meta_desc'] },
                { id: 'rooms', label: 'Rooms Page SEO', fields: ['rooms_meta_title', 'rooms_meta_desc'] },
                { id: 'cafe', label: 'Cafe Page SEO', fields: ['cafe_meta_title', 'cafe_meta_desc'] },
                { id: 'gallery', label: 'Gallery Page SEO', fields: ['gallery_meta_title', 'gallery_meta_desc'] },
                { id: 'booking', label: 'Booking Page SEO', fields: ['booking_meta_title', 'booking_meta_desc'] },
                { id: 'terms', label: 'Terms Page SEO', fields: ['terms_meta_title', 'terms_meta_desc'] },
                { id: 'privacy', label: 'Privacy Page SEO', fields: ['privacy_meta_title', 'privacy_meta_desc'] },
            ]
        }]
    },
];

const FIELD_DEFS: Record<string, FieldDef> = {
    hero_title: { label: 'Hero Title', type: 'text', section: 'Hero' },
    hero_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'Hero' },
    hero_video_url: { label: 'Hero Background Video URL', type: 'image', section: 'Hero', description: 'Optional video to play behind hero slides' },
    home_feature_1_title: { label: 'Feature 1 Title', type: 'text', section: 'Features' },
    home_feature_1_desc: { label: 'Feature 1 Description', type: 'textarea', section: 'Features' },
    home_feature_2_title: { label: 'Feature 2 Title', type: 'text', section: 'Features' },
    home_feature_2_desc: { label: 'Feature 2 Description', type: 'textarea', section: 'Features' },
    home_feature_3_title: { label: 'Feature 3 Title', type: 'text', section: 'Features' },
    home_feature_3_desc: { label: 'Feature 3 Description', type: 'textarea', section: 'Features' },
    home_rooms_title: { label: 'Rooms Section Title', type: 'text', section: 'Rooms' },
    home_rooms_desc: { label: 'Rooms Section Description', type: 'textarea', section: 'Rooms' },
    home_cafe_title: { label: 'Cafe Section Title', type: 'text', section: 'Cafe' },
    home_cafe_desc: { label: 'Cafe Section Description', type: 'textarea', section: 'Cafe' },
    home_cafe_bullets: { label: 'Cafe Bullet Points (one per line)', type: 'textarea', section: 'Cafe', description: 'Each line becomes a bullet point' },
    home_reviews_title: { label: 'Reviews Section Title', type: 'text', section: 'Reviews' },
    home_reviews_subtitle: { label: 'Reviews Section Subtitle', type: 'text', section: 'Reviews' },
    home_cta_title: { label: 'CTA Title', type: 'text', section: 'CTA' },
    home_cta_desc: { label: 'CTA Description', type: 'textarea', section: 'CTA' },

    about_hero_title: { label: 'Hero Title', type: 'text', section: 'Hero' },
    about_hero_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'Hero' },
    about_tab_story_label: { label: 'Story Tab Label', type: 'text', section: 'Tabs' },
    about_tab_mission_label: { label: 'Mission Tab Label', type: 'text', section: 'Tabs' },
    about_story_title: { label: 'Story Title', type: 'text', section: 'Story' },
    about_story_text: { label: 'Story Content', type: 'richtext', section: 'Story' },
    about_vision_title: { label: 'Vision Card Title', type: 'text', section: 'Story' },
    about_vision_text: { label: 'Vision Card Text', type: 'textarea', section: 'Story' },
    about_quality_title: { label: 'Quality Card Title', type: 'text', section: 'Story' },
    about_quality_text: { label: 'Quality Card Text', type: 'textarea', section: 'Story' },
    about_today_title: { label: 'Today Card Title', type: 'text', section: 'Story' },
    about_today_text: { label: 'Today Card Text', type: 'textarea', section: 'Story' },
    about_position_heading: { label: 'Position Section Heading', type: 'text', section: 'Location' },
    location_section_content: { label: 'Location Content', type: 'textarea', section: 'Location' },
    about_mission_heading: { label: 'Mission Section Heading', type: 'text', section: 'Mission' },
    about_mission: { label: 'Mission Statement', type: 'richtext', section: 'Mission' },
    about_values: { label: 'Values (JSON array)', type: 'json', section: 'Mission', description: 'JSON array of { icon, title, description } objects' },
    about_commitment_heading: { label: 'Commitment Heading', type: 'text', section: 'Commitment' },
    about_commitment: { label: 'Commitment Text', type: 'richtext', section: 'Commitment' },
    about_commitment_items: { label: 'Commitment Pillars (comma-separated)', type: 'text', section: 'Commitment', description: 'E.g. Quality, Comfort, Authenticity, Sustainability' },
    about_stats_heading: { label: 'Statistics Section Heading', type: 'text', section: 'Statistics' },
    about_intro_subheading: { label: 'Statistics Subheading', type: 'text', section: 'Statistics' },
    about_statistics: { label: 'Statistics (JSON array)', type: 'json', section: 'Statistics', description: 'JSON array of { number, label } objects' },

    contact_heading: { label: 'Page Heading', type: 'text', section: 'Hero' },
    contact_subtitle: { label: 'Page Subtitle', type: 'textarea', section: 'Hero' },
    contact_phone_label: { label: 'Phone Section Label', type: 'text', section: 'Info' },
    contact_phone: { label: 'Phone Number', type: 'text', section: 'Info' },
    contact_phone_note: { label: 'Phone Note', type: 'text', section: 'Info' },
    contact_email_label: { label: 'Email Section Label', type: 'text', section: 'Info' },
    contact_email: { label: 'Email Address', type: 'text', section: 'Info' },
    contact_email_note: { label: 'Email Note', type: 'text', section: 'Info' },
    contact_address_label: { label: 'Address Section Label', type: 'text', section: 'Info' },
    contact_address: { label: 'Address Text', type: 'text', section: 'Info' },
    contact_checkinout_label: { label: 'Check-in/out Section Label', type: 'text', section: 'Info' },
    contact_form_heading: { label: 'Form Heading', type: 'text', section: 'Form' },
    contact_form_text: { label: 'Form Description', type: 'textarea', section: 'Form' },
    contact_form_thank_you: { label: 'Thank You Message', type: 'text', section: 'Form' },
    contact_form_thank_you_note: { label: 'Email Client Note', type: 'text', section: 'Form' },
    contact_checkinout_note: { label: 'Check-in/out Note', type: 'text', section: 'Info' },
    contact_location_heading: { label: 'Map Section Heading', type: 'text', section: 'Map' },
    google_maps_url: { label: 'Google Maps Embed URL', type: 'text', section: 'Map' },
    contact_getting_here_title: { label: 'Getting Here Title', type: 'text', section: 'Map' },
    contact_getting_here_text: { label: 'Getting Here Text', type: 'textarea', section: 'Map' },
    contact_location_assistance_heading: { label: 'Location Assistance Heading', type: 'text', section: 'Assistance' },
    contact_location_assistance_text: { label: 'Location Assistance Text', type: 'textarea', section: 'Assistance' },
    tiktok_embed_url: { label: 'TikTok Embed URL', type: 'text', section: 'Assistance' },
    contact_cta_text: { label: 'CTA Text', type: 'text', section: 'CTA' },

    cafe_hero_title: { label: 'Hero Title', type: 'text', section: 'Hero' },
    cafe_hero_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'Hero' },
    cafe_hero_btn_reserve: { label: 'Hero — Call to Reserve Button', type: 'text', section: 'Hero' },
    cafe_hero_btn_menu: { label: 'Hero — View Menu Button', type: 'text', section: 'Hero' },
    cafe_description: { label: 'Description Text', type: 'richtext', section: 'Description' },
    cafe_hours: { label: 'Hours Label', type: 'text', section: 'Description' },
    cafe_featured_heading: { label: 'Featured Dishes Heading', type: 'text', section: 'Menu' },
    cafe_full_menu_heading: { label: 'Full Menu Heading', type: 'text', section: 'Menu' },
    cafe_featured_empty: { label: 'No Featured Dishes Message', type: 'text', section: 'Menu' },
    cafe_menu_empty: { label: 'No Menu Items Message', type: 'text', section: 'Menu' },
    cafe_menu_card_text: { label: 'View Full Menu Card Text', type: 'text', section: 'Menu' },
    cafe_view_full_menu_btn: { label: 'View Full Menu Button', type: 'text', section: 'Menu' },
    cafe_cta_heading: { label: 'CTA Heading', type: 'text', section: 'CTA' },
    cafe_cta_text: { label: 'CTA Description', type: 'text', section: 'CTA' },
    cafe_cta_btn_reserve: { label: 'CTA — Call to Reserve Button', type: 'text', section: 'CTA' },
    cafe_cta_btn_room: { label: 'CTA — Book a Room Button', type: 'text', section: 'CTA' },

    rooms_section_label: { label: 'Section Label (over rooms)', type: 'text', section: 'Hero' },
    rooms_hero_title: { label: 'Hero Title', type: 'text', section: 'Hero' },
    rooms_hero_desc: { label: 'Hero Description', type: 'textarea', section: 'Hero' },
    rooms_search_placeholder: { label: 'Search Placeholder', type: 'text', section: 'Search' },
    rooms_filter_btn: { label: 'Filter Button Text', type: 'text', section: 'Search' },
    rooms_filter_heading: { label: 'Filter Panel Heading', type: 'text', section: 'Search' },
    rooms_filter_ac_label: { label: 'AC Filter Section Label', type: 'text', section: 'Search' },
    rooms_filter_ac_all: { label: 'AC Filter — All', type: 'text', section: 'Search' },
    rooms_filter_ac_ac: { label: 'AC Filter — AC', type: 'text', section: 'Search' },
    rooms_filter_ac_nonac: { label: 'AC Filter — Non-AC', type: 'text', section: 'Search' },
    rooms_filter_type_label: { label: 'Type Filter Section Label', type: 'text', section: 'Search' },
    rooms_filter_type_all: { label: 'Type Filter — All', type: 'text', section: 'Search' },
    rooms_filter_type_single: { label: 'Type Filter — Single', type: 'text', section: 'Search' },
    rooms_filter_type_double: { label: 'Type Filter — Double', type: 'text', section: 'Search' },
    rooms_filter_min_price: { label: 'Min Price Label', type: 'text', section: 'Search' },
    rooms_filter_max_price: { label: 'Max Price Label', type: 'text', section: 'Search' },
    rooms_filter_clear: { label: 'Clear Filters Text', type: 'text', section: 'Search' },
    rooms_no_results: { label: 'No Results Message', type: 'text', section: 'Search' },
    rooms_no_rooms: { label: 'No Rooms Message', type: 'text', section: 'Search' },
    rooms_count_found: { label: 'Rooms Found Template', type: 'text', section: 'Search', description: 'Use {count} as placeholder for the number' },
    rooms_view_details: { label: 'View Details Tooltip', type: 'text', section: 'Labels' },
    rooms_label_guests: { label: 'Guests Label', type: 'text', section: 'Labels' },
    rooms_label_people: { label: 'People Suffix', type: 'text', section: 'Labels' },
    rooms_label_bed: { label: 'Bed Type Label', type: 'text', section: 'Labels' },
    rooms_label_night: { label: '/night Suffix', type: 'text', section: 'Labels' },
    rooms_label_npr: { label: 'NPR Currency Label', type: 'text', section: 'Labels' },
    rooms_label_book: { label: 'Book Now Button', type: 'text', section: 'Labels' },
    rooms_label_unavailable: { label: 'Unavailable Label', type: 'text', section: 'Labels' },
    rooms_label_floor: { label: 'Floor Prefix', type: 'text', section: 'Labels' },
    rooms_label_featured: { label: 'Featured Badge Label', type: 'text', section: 'Labels' },
    rooms_label_limited: { label: 'Limited Availability Label', type: 'text', section: 'Labels' },
    rooms_label_booked: { label: 'Booked Label', type: 'text', section: 'Labels' },
    rooms_label_maintenance: { label: 'Under Maintenance Label', type: 'text', section: 'Labels' },
    rooms_label_more: { label: '+N More Template', type: 'text', section: 'Labels', description: 'Use {count} as placeholder' },
    rooms_label_ac: { label: 'AC Badge Label', type: 'text', section: 'Labels' },
    rooms_label_nonac: { label: 'Non-AC Badge Label', type: 'text', section: 'Labels' },
    rooms_type_fallback: { label: 'Room Type Fallback', type: 'text', section: 'Labels' },
    rooms_bed_fallback: { label: 'Bed Type Fallback', type: 'text', section: 'Labels' },
    view_full_menu_image: { label: 'Full Menu Image URL', type: 'image', section: 'Menu' },

    roomdetails_desc_heading: { label: 'Description Section Heading', type: 'text', section: 'Headings' },
    roomdetails_amenities_heading: { label: 'Amenities Section Heading', type: 'text', section: 'Headings' },
    roomdetails_policies_heading: { label: 'Policies Section Heading', type: 'text', section: 'Headings' },
    roomdetails_reviews_heading: { label: 'Reviews Section Heading', type: 'text', section: 'Headings' },
    roomdetails_reserve_heading: { label: 'Reserve Section Heading', type: 'text', section: 'Headings' },
    roomdetails_capacity_label: { label: 'Capacity Label', type: 'text', section: 'Stats' },
    roomdetails_size_label: { label: 'Size Label', type: 'text', section: 'Stats' },
    roomdetails_bedtype_label: { label: 'Bed Type Label', type: 'text', section: 'Stats' },
    roomdetails_availability_label: { label: 'Availability Label', type: 'text', section: 'Stats' },
    roomdetails_per_night: { label: 'Per Night Text', type: 'text', section: 'Stats' },
    roomdetails_guests_suffix: { label: 'Guests Suffix', type: 'text', section: 'Stats' },
    roomdetails_checkin_heading: { label: 'Check-in Heading', type: 'text', section: 'Policies' },
    roomdetails_cancel_heading: { label: 'Cancellation Heading', type: 'text', section: 'Policies' },
    roomdetails_checkin_text: { label: 'Check-in Text Template', type: 'text', section: 'Policies', description: 'Use {checkin} and {checkout} as placeholders' },
    roomdetails_cancel_text: { label: 'Cancellation Text', type: 'text', section: 'Policies' },
    roomdetails_no_reviews_heading: { label: 'No Reviews Heading', type: 'text', section: 'Empty' },
    roomdetails_no_reviews_text: { label: 'No Reviews Description', type: 'text', section: 'Empty' },
    roomdetails_amenity_fallback: { label: 'Fallback Amenities (comma-separated)', type: 'text', section: 'Empty' },
    roomdetails_type_fallback: { label: 'Room Type Fallback', type: 'text', section: 'Headings' },
    roomdetails_room_number_label: { label: 'Room Number Label Template', type: 'text', section: 'Headings', description: 'Use {number} as placeholder' },
    roomdetails_floor_label: { label: 'Floor Label Template', type: 'text', section: 'Headings', description: 'Use {floor} as placeholder' },
    roomdetails_no_ac_label: { label: 'Non-AC Display Label', type: 'text', section: 'Headings' },
    roomdetails_ac_label: { label: 'AC Display Label', type: 'text', section: 'Headings' },

    gallery_heading: { label: 'Hero Heading', type: 'text', section: 'Hero' },
    gallery_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'Hero' },
    gallery_filter_all: { label: 'All Photos Button', type: 'text', section: 'Filters' },
    gallery_filter_gallery: { label: 'Gallery Filter Button', type: 'text', section: 'Filters' },
    gallery_filter_exterior: { label: 'Exterior Filter Button', type: 'text', section: 'Filters' },
    gallery_filter_other: { label: 'Other Filter Button', type: 'text', section: 'Filters' },
    gallery_empty_heading: { label: 'No Photos Heading', type: 'text', section: 'Empty' },
    gallery_empty_text: { label: 'No Photos Description', type: 'text', section: 'Empty' },

    privacy_hero_heading: { label: 'Hero Heading', type: 'text', section: 'Hero' },
    privacy_hero_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'Hero' },
    privacy_last_updated_label: { label: 'Last Updated Label', type: 'text', section: 'Hero' },
    privacy_content: { label: 'Page Content (HTML)', type: 'richtext', section: 'Content' },
    privacy_cta_heading: { label: 'CTA Section Heading', type: 'text', section: 'CTA' },
    privacy_cta_text: { label: 'CTA Description', type: 'textarea', section: 'CTA' },
    privacy_cta_btn_book: { label: 'CTA — Book Button', type: 'text', section: 'CTA' },
    privacy_cta_btn_contact: { label: 'CTA — Contact Button', type: 'text', section: 'CTA' },
    privacy_not_found_text: { label: 'Not Found Fallback Text', type: 'text', section: 'Content' },

    terms_hero_heading: { label: 'Hero Heading', type: 'text', section: 'Hero' },
    terms_hero_subtitle: { label: 'Hero Subtitle', type: 'text', section: 'Hero' },
    terms_last_updated_label: { label: 'Last Updated Label', type: 'text', section: 'Hero' },
    terms_content: { label: 'Page Content (HTML)', type: 'richtext', section: 'Content' },
    terms_cta_heading: { label: 'CTA Section Heading', type: 'text', section: 'CTA' },
    terms_cta_text: { label: 'CTA Description', type: 'textarea', section: 'CTA' },
    terms_cta_btn_book: { label: 'CTA — Book Button', type: 'text', section: 'CTA' },
    terms_cta_btn_contact: { label: 'CTA — Contact Button', type: 'text', section: 'CTA' },
    terms_not_found_text: { label: 'Not Found Fallback Text', type: 'text', section: 'Content' },

    site_name: { label: 'Site Name', type: 'text', section: 'Navbar' },
    navbar_phone: { label: 'Phone Number', type: 'text', section: 'Navbar' },
    navbar_email: { label: 'Email Address', type: 'text', section: 'Navbar' },
    logo_url: { label: 'Logo Image URL', type: 'image', section: 'Navbar', description: 'Leave empty to use default logo' },
    footer_text: { label: 'Footer Description', type: 'textarea', section: 'Footer' },
    footer_quicklinks_heading: { label: 'Quick Links Section Heading', type: 'text', section: 'Footer' },
    footer_getintouch_heading: { label: 'Get in Touch Heading', type: 'text', section: 'Footer' },
    footer_connect_heading: { label: 'Connect & Hours Heading', type: 'text', section: 'Footer' },
    footer_operating_hours_heading: { label: 'Operating Hours Heading', type: 'text', section: 'Footer' },
    footer_premium_label: { label: 'Premium Hospitality Label', type: 'text', section: 'Footer' },
    footer_phone_sublabel: { label: 'Phone Sublabel', type: 'text', section: 'Footer' },
    footer_email_sublabel: { label: 'Email Sublabel', type: 'text', section: 'Footer' },
    footer_location_sublabel: { label: 'Location Sublabel', type: 'text', section: 'Footer' },
    footer_rights: { label: 'All Rights Reserved Text', type: 'text', section: 'Footer' },
    footer_made_with: { label: 'Made With Love Text', type: 'text', section: 'Footer' },
    footer_social_facebook: { label: 'Facebook URL', type: 'text', section: 'Social' },
    footer_social_instagram: { label: 'Instagram URL', type: 'text', section: 'Social' },
    footer_social_whatsapp: { label: 'WhatsApp URL', type: 'text', section: 'Social' },
    footer_social_tiktok: { label: 'TikTok URL', type: 'text', section: 'Social' },
    footer_amenity_1_label: { label: 'Amenity 1 Label', type: 'text', section: 'Amenities' },
    footer_amenity_1_icon: { label: 'Amenity 1 Icon (Lucide name)', type: 'text', section: 'Amenities' },
    footer_amenity_2_label: { label: 'Amenity 2 Label', type: 'text', section: 'Amenities' },
    footer_amenity_2_icon: { label: 'Amenity 2 Icon (Lucide name)', type: 'text', section: 'Amenities' },
    footer_amenity_3_label: { label: 'Amenity 3 Label', type: 'text', section: 'Amenities' },
    footer_amenity_3_icon: { label: 'Amenity 3 Icon (Lucide name)', type: 'text', section: 'Amenities' },
    footer_amenity_4_label: { label: 'Amenity 4 Label', type: 'text', section: 'Amenities' },
    footer_amenity_4_icon: { label: 'Amenity 4 Icon (Lucide name)', type: 'text', section: 'Amenities' },
    footer_bottom_privacy: { label: 'Privacy Policy Bottom Link', type: 'text', section: 'Bottom' },
    footer_bottom_terms: { label: 'Terms Bottom Link', type: 'text', section: 'Bottom' },
    footer_hours_checkin_label: { label: 'Check-in Row Label', type: 'text', section: 'Hours' },
    footer_hours_checkout_label: { label: 'Check-out Row Label', type: 'text', section: 'Hours' },
    footer_hours_cafe_label: { label: 'Cafe Hours Row Label', type: 'text', section: 'Hours' },
    checkin_time: { label: 'Check-in Time', type: 'text', section: 'Hours' },
    checkout_time: { label: 'Check-out Time', type: 'text', section: 'Hours' },
    cafe_hours_text: { label: 'Cafe Hours Value', type: 'text', section: 'Hours' },

    btn_book_stay: { label: 'Book Your Stay', type: 'text', section: 'Buttons' },
    btn_book_now: { label: 'Book Now', type: 'text', section: 'Buttons' },
    btn_view_menu: { label: 'View Menu', type: 'text', section: 'Buttons' },
    btn_view_rooms: { label: 'View All Rooms', type: 'text', section: 'Buttons' },

    room_sidebar_feature_1: { label: 'Sidebar Feature 1', type: 'text', section: 'Sidebar' },
    room_sidebar_feature_2: { label: 'Sidebar Feature 2', type: 'text', section: 'Sidebar' },
    room_sidebar_feature_3: { label: 'Sidebar Feature 3', type: 'text', section: 'Sidebar' },
    room_back_link: { label: 'Back Link Text', type: 'text', section: 'Sidebar' },
    room_discover_heading: { label: 'Discover Other Rooms Heading', type: 'text', section: 'Sidebar' },
    room_book_this_room: { label: 'Book This Room Button', type: 'text', section: 'Sidebar' },
    room_no_credit_card_text: { label: 'No Credit Card Notice', type: 'text', section: 'Sidebar' },
    room_unavailable_maintenance: { label: 'Maintenance Notice', type: 'text', section: 'Sidebar' },
    cancel_policy: { label: 'Cancellation Policy Text', type: 'text', section: 'Policies' },

    booking_sidebar_features: { label: 'Booking Sidebar Features (one per line)', type: 'textarea', section: 'Booking' },

    home_meta_title: { label: 'Home Page Meta Title', type: 'text', section: 'SEO' },
    home_meta_desc: { label: 'Home Page Meta Description', type: 'textarea', section: 'SEO' },
    about_meta_title: { label: 'About Page Meta Title', type: 'text', section: 'SEO' },
    about_meta_desc: { label: 'About Page Meta Description', type: 'textarea', section: 'SEO' },
    contact_meta_title: { label: 'Contact Page Meta Title', type: 'text', section: 'SEO' },
    contact_meta_desc: { label: 'Contact Page Meta Description', type: 'textarea', section: 'SEO' },
    rooms_meta_title: { label: 'Rooms Page Meta Title', type: 'text', section: 'SEO' },
    rooms_meta_desc: { label: 'Rooms Page Meta Description', type: 'textarea', section: 'SEO' },
    cafe_meta_title: { label: 'Cafe Page Meta Title', type: 'text', section: 'SEO' },
    cafe_meta_desc: { label: 'Cafe Page Meta Description', type: 'textarea', section: 'SEO' },
    gallery_meta_title: { label: 'Gallery Page Meta Title', type: 'text', section: 'SEO' },
    gallery_meta_desc: { label: 'Gallery Page Meta Description', type: 'textarea', section: 'SEO' },
    booking_meta_title: { label: 'Booking Page Meta Title', type: 'text', section: 'SEO' },
    booking_meta_desc: { label: 'Booking Page Meta Description', type: 'textarea', section: 'SEO' },
    terms_meta_title: { label: 'Terms Page Meta Title', type: 'text', section: 'SEO' },
    terms_meta_desc: { label: 'Terms Page Meta Description', type: 'textarea', section: 'SEO' },
    privacy_meta_title: { label: 'Privacy Page Meta Title', type: 'text', section: 'SEO' },
    privacy_meta_desc: { label: 'Privacy Page Meta Description', type: 'textarea', section: 'SEO' },
};

const ALL_KEYS = Object.keys(FIELD_DEFS);

const ContentEditor = () => {
    const [contents, setContents] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [seeding, setSeeding] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [toastMessage, setToastMessage] = useState('');
    const [activePage, setActivePage] = useState('home');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['hero']));
    const [showMediaPickerFor, setShowMediaPickerFor] = useState<string | null>(null);

    const toggleSection = (sectionId: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(sectionId)) next.delete(sectionId);
            else next.add(sectionId);
            return next;
        });
    };

    const loadContent = () => {
        setLoading(true);
        getAllSiteContent().then(async ({ data }) => {
            const map: Record<string, string> = {};
            if (data) {
                for (const item of data) {
                    map[item.key] = item.value;
                }
            }
            const existingKeys = data?.length || 0;
            const needsSeed = existingKeys < 5 && ALL_KEYS.length > 0;
            if (needsSeed) {
                for (const key of ALL_KEYS) {
                    if (!map[key] && CONTENT_DEFAULTS[key]) {
                        try {
                            await updateSiteContent(key, CONTENT_DEFAULTS[key]);
                            map[key] = CONTENT_DEFAULTS[key];
                        } catch (err) {
                            console.error(`Failed to seed default for ${key}:`, err);
                        }
                    }
                }
            } else {
                for (const key of ALL_KEYS) {
                    if (!map[key]) map[key] = '';
                }
            }
            setContents(map);
            setLoading(false);
        }).catch((err) => {
            setLoading(false);
            console.error('Failed to load content:', err);
        });
    };

    useEffect(() => {
        loadContent();
    }, []);

    const seedDefaults = async () => {
        setSeeding(true);
        const map = { ...contents };
        let count = 0;
        for (const key of ALL_KEYS) {
            if (CONTENT_DEFAULTS[key] && !map[key]) {
                await updateSiteContent(key, CONTENT_DEFAULTS[key]);
                map[key] = CONTENT_DEFAULTS[key];
                count++;
            }
        }
        setContents(map);
        setSeeding(false);
        setToastMessage(`Restored ${count} default value(s)!`);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const handleSave = async (key: string) => {
        const value = contents[key] || '';
        if (key === 'about_values' || key === 'about_statistics') {
            if (value.trim()) {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) throw new Error('Must be a JSON array');
                } catch (e) {
                    setToastMessage(`JSON error: ${e instanceof Error ? e.message : 'Invalid JSON'}`);
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
            setToastMessage(`"${FIELD_DEFS[key]?.label || key}" saved successfully!`);
        }
        setTimeout(() => setToastMessage(''), 3000);
    };

    const getFieldValue = (key: string) => contents[key] ?? '';

    const renderField = (key: string) => {
        const def = FIELD_DEFS[key];
        if (!def) return null;
        const value = getFieldValue(key);
        const isSaving = saving === key;

        const fieldContent = () => {
            if (def.type === 'richtext') {
                return (
                    <RichTextEditor
                        value={value}
                        onChange={(html) => setContents(prev => ({ ...prev, [key]: html }))}
                        minHeight={200}
                    />
                );
            }
            if (def.type === 'image') {
                return (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={value}
                                onChange={(e) => setContents(prev => ({ ...prev, [key]: e.target.value }))}
                                placeholder="https://..."
                                className="input flex-1 font-mono text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => setShowMediaPickerFor(key)}
                                className="p-2.5 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors"
                                title="Pick from Media Library"
                            >
                                <Image size={18} />
                            </button>
                        </div>
                        {value && (
                            <img src={value} alt={def.label} className="max-h-32 rounded-lg object-cover border border-gray-200" />
                        )}
                    </div>
                );
            }
            if (def.type === 'textarea' || def.type === 'json') {
                return (
                    <textarea
                        value={value}
                        onChange={(e) => setContents(prev => ({ ...prev, [key]: e.target.value }))}
                        className="input w-full min-h-[100px] font-mono text-sm"
                        rows={def.type === 'json' ? 8 : 5}
                        placeholder={def.type === 'json' ? '[{ "key": "value" }]' : ''}
                    />
                );
            }
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setContents(prev => ({ ...prev, [key]: e.target.value }))}
                    className="input w-full"
                />
            );
        };

        return (
            <div key={key} className="bg-white rounded-lg border border-gray-100 p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <label className="text-sm font-semibold text-gray-900">{def.label}</label>
                        {def.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{def.description}</p>
                        )}
                    </div>
                    <button
                        onClick={() => handleSave(key)}
                        disabled={isSaving}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-xs font-medium transition-colors flex-shrink-0 ml-4"
                    >
                        {isSaving ? (
                            <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                            <Save size={14} />
                        )}
                        <span>Save</span>
                    </button>
                </div>
                {fieldContent()}
            </div>
        );
    };

    const currentPage = pagesConfig.find(p => p.id === activePage);

    return (
        <div className="space-y-6">
            <Helmet><title>Content Editor | Highlands Cafe & Motel Inn</title></Helmet>
            {toastMessage && (
                <div className="fixed top-24 right-4 z-50 max-w-sm px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in bg-green-50 text-green-700 border border-green-200" role="alert">
                    {toastMessage}
                </div>
            )}

            {showMediaPickerFor && (
                <MediaPicker
                    onSelect={(url) => {
                        if (showMediaPickerFor) {
                            setContents(prev => ({ ...prev, [showMediaPickerFor]: url }));
                        }
                        setShowMediaPickerFor(null);
                    }}
                    onClose={() => setShowMediaPickerFor(null)}
                />
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Website Content</h1>
                    <p className="text-gray-500">Manage all text content across the entire website</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={seedDefaults}
                        disabled={seeding}
                        className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={seeding ? 'animate-spin' : ''} />
                        <span>{seeding ? 'Restoring...' : 'Restore Defaults'}</span>
                    </button>
                    <button onClick={loadContent} className="btn-secondary flex items-center space-x-2">
                        <RefreshCw size={18} />
                        <span>Refresh All</span>
                    </button>
                </div>
            </div>

            {/* Page Tabs */}
            <div className="flex flex-wrap gap-1 bg-white rounded-xl shadow-sm border border-gray-100 p-1.5">
                {pagesConfig.map((page) => {
                    const Icon = page.icon;
                    return (
                        <button
                            key={page.id}
                            onClick={() => setActivePage(page.id)}
                            className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activePage === page.id
                                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <Icon size={16} />
                            <span>{page.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <Skeleton className="h-5 w-48 mb-4" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </div>
            ) : currentPage ? (
                <div className="space-y-6">
                    {currentPage.groups.map((group, gi) => (
                        <div key={gi}>
                            {currentPage.groups.length > 1 && (
                                <h3 className="text-lg font-bold text-gray-700 font-heading mb-3">{group.label}</h3>
                            )}
                            <div className="space-y-3">
                                {group.sections.map((section) => {
                                    const isExpanded = expandedSections.has(section.id);
                                    const visibleFields = section.fields.filter(f => FIELD_DEFS[f]);
                                    if (visibleFields.length === 0) return null;
                                    return (
                                        <div key={section.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                            <button
                                                onClick={() => toggleSection(section.id)}
                                                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    {isExpanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                                                    <span className="font-bold text-gray-800">{section.label}</span>
                                                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{visibleFields.length}</span>
                                                </div>
                                            </button>
                                            {isExpanded && (
                                                <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-3">
                                                    {visibleFields.map(f => renderField(f))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default ContentEditor;
