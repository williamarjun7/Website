-- 20260621153000_seed_site_content.sql
-- Seed ALL site_content defaults so the CMS has content to display
-- and the website reads from DB instead of fallback strings.

-- Home - Hero
INSERT INTO site_content (key, value) VALUES
    ('hero_title', 'Welcome to Highlands'),
    ('hero_subtitle', 'Experience Comfort in the Heart of the Highlands')
ON CONFLICT (key) DO NOTHING;

-- Home - Features
INSERT INTO site_content (key, value) VALUES
    ('home_feature_1_title', 'Prime Location'),
    ('home_feature_1_desc', 'Nestled in the highlands with stunning mountain views'),
    ('home_feature_2_title', 'On-Site Cafe'),
    ('home_feature_2_desc', 'Enjoy authentic local cuisine and fresh coffee daily'),
    ('home_feature_3_title', 'Warm Hospitality'),
    ('home_feature_3_desc', 'Experience genuine care and personalized service')
ON CONFLICT (key) DO NOTHING;

-- Home - Rooms
INSERT INTO site_content (key, value) VALUES
    ('home_rooms_title', 'Our Rooms'),
    ('home_rooms_desc', 'Choose from our selection of comfortable and well-appointed rooms')
ON CONFLICT (key) DO NOTHING;

-- Home - Cafe Highlight
INSERT INTO site_content (key, value) VALUES
    ('home_cafe_title', 'Highlands Cafe'),
    ('home_cafe_desc', 'Start your day with a delicious breakfast or unwind with authentic local cuisine. Our on-site cafe serves fresh, locally-sourced dishes with breathtaking mountain views.'),
    ('home_cafe_bullets', 'Authentic Nepali cuisine\nFresh local ingredients\nMountain view seating')
ON CONFLICT (key) DO NOTHING;

-- Home - Reviews
INSERT INTO site_content (key, value) VALUES
    ('home_reviews_title', 'What Our Guests Say'),
    ('home_reviews_subtitle', 'Real stories from real guests at Highlands')
ON CONFLICT (key) DO NOTHING;

-- Home - CTA
INSERT INTO site_content (key, value) VALUES
    ('home_cta_title', 'Ready for Your Highland Escape?'),
    ('home_cta_desc', 'Book your stay today and experience the warmth of the highlands')
ON CONFLICT (key) DO NOTHING;

-- About - Hero
INSERT INTO site_content (key, value) VALUES
    ('about_hero_title', 'Our Story'),
    ('about_hero_subtitle', 'Discover the passion behind Highlands Cafe & Motel Inn')
ON CONFLICT (key) DO NOTHING;

-- About - Tabs
INSERT INTO site_content (key, value) VALUES
    ('about_tab_story_label', 'Our Story'),
    ('about_tab_mission_label', 'Mission & Values')
ON CONFLICT (key) DO NOTHING;

-- About - Story
INSERT INTO site_content (key, value) VALUES
    ('about_story_title', 'From Humble Beginnings to Highland Excellence'),
    ('about_story_text', 'Founded with a vision to redefine hospitality in the Karnali region, Highlands Cafe & Motel Inn is the newest destination for travelers seeking authentic comfort and breathtaking views.'),
    ('about_vision_title', 'The Vision'),
    ('about_vision_text', 'Conceived to bring premium boutique hospitality to the Surkhet valley'),
    ('about_quality_title', 'The Quality'),
    ('about_quality_text', 'Built with attention to detail and a commitment to guest comfort'),
    ('about_today_title', 'Today'),
    ('about_today_text', 'Open and ready to welcome guests with unmatched local warmth')
ON CONFLICT (key) DO NOTHING;

-- About - Position
INSERT INTO site_content (key, value) VALUES
    ('about_position_heading', 'Perfectly Positioned'),
    ('location_section_content', 'Nestled in the Khajura region of Birendranagar-07, Surkhet, our location offers the perfect blend of accessibility and serenity.')
ON CONFLICT (key) DO NOTHING;

-- About - Mission
INSERT INTO site_content (key, value) VALUES
    ('about_mission_heading', 'Our Mission & Values'),
    ('about_mission', '"To create unforgettable experiences through exceptional hospitality, authentic cuisine, and genuine connection to our Himalayan heritage."')
ON CONFLICT (key) DO NOTHING;

-- About - Values (JSON)
INSERT INTO site_content (key, value) VALUES
    ('about_values', '[{"icon":"Heart","title":"Hospitality First","description":"Every guest is family."},{"icon":"Coffee","title":"Authentic Experiences","description":"We celebrate Nepali culture."},{"icon":"Award","title":"Excellence in Service","description":"World-class hospitality in the highlands."},{"icon":"MapPin","title":"Sustainable Tourism","description":"Preserving our environment and supporting local communities."}]')
ON CONFLICT (key) DO NOTHING;

-- About - Commitment
INSERT INTO site_content (key, value) VALUES
    ('about_commitment_heading', 'Our Commitment'),
    ('about_commitment', 'We are dedicated to creating a space where travelers can rest, recharge, and reconnect with nature and themselves.'),
    ('about_commitment_items', 'Quality, Comfort, Authenticity, Sustainability')
ON CONFLICT (key) DO NOTHING;

-- About - Stats
INSERT INTO site_content (key, value) VALUES
    ('about_stats_heading', 'Highlands by Numbers'),
    ('about_intro_subheading', 'Our commitment to excellence speaks for itself')
ON CONFLICT (key) DO NOTHING;

-- About - Statistics (JSON)
INSERT INTO site_content (key, value) VALUES
    ('about_statistics', '[{"number":"100%","label":"Guest Satisfaction"},{"number":"Newly","label":"Opened & Ready"},{"number":"24/7","label":"Care & Support"},{"number":"Premium","label":"Local Comfort"}]')
ON CONFLICT (key) DO NOTHING;

-- Contact - Hero
INSERT INTO site_content (key, value) VALUES
    ('contact_heading', 'Contact Us'),
    ('contact_subtitle', 'We''re here to help make your stay unforgettable. Reach out to us for any questions or special requests.')
ON CONFLICT (key) DO NOTHING;

-- Contact - Info
INSERT INTO site_content (key, value) VALUES
    ('contact_phone_label', 'Phone & WhatsApp'),
    ('contact_phone', '+977 9763215874'),
    ('contact_phone_note', 'Call or WhatsApp anytime'),
    ('contact_email_label', 'Email'),
    ('contact_email', 'highlandscafemotelinn@gmail.com'),
    ('contact_email_note', 'Quick response within 24 hours'),
    ('contact_address_label', 'Address'),
    ('contact_address', 'Birendranagar-07, Khajura, Surkhet, Karnali Province, Nepal'),
    ('contact_checkinout_label', 'Check-in / Check-out'),
    ('contact_checkinout_note', 'Early check-in and late check-out available upon request'),
    ('contact_form_name_placeholder', 'Your Name'),
    ('contact_form_email_placeholder', 'Your Email'),
    ('contact_form_message_placeholder', 'Your Message')
ON CONFLICT (key) DO NOTHING;

-- Contact - Form
INSERT INTO site_content (key, value) VALUES
    ('contact_form_heading', 'Send Us a Message'),
    ('contact_form_text', 'Fill in the form below and we''ll get back to you shortly.'),
    ('contact_form_thank_you', 'Thank you! We will get back to you soon.'),
    ('contact_form_thank_you_note', 'Your email client should open. If not, please email us directly.')
ON CONFLICT (key) DO NOTHING;

-- Contact - Map
INSERT INTO site_content (key, value) VALUES
    ('contact_location_heading', 'Location'),
    ('google_maps_url', 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30327.168373915127!2d81.58876419067386!3d28.58478551046912!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a285b5b738260f%3A0xb0fb170f840c8984!2sHighlands%20Cafe%20%26%20Motel%20Inn!5e1!3m2!1sen!2snp!4v1781772223538!5m2!1sen!2snp'),
    ('contact_getting_here_title', 'Getting Here'),
    ('contact_getting_here_text', 'We''re located in the scenic region of Surkhet, easily accessible from the main city area. Free private parking is available for all our guests.')
ON CONFLICT (key) DO NOTHING;

-- Contact - Assistance
INSERT INTO site_content (key, value) VALUES
    ('contact_location_assistance_heading', 'Location Assistance'),
    ('contact_location_assistance_text', 'Having trouble locating us? The Google Maps pin above is accurate. Simply open it on your phone and follow the navigation.'),
    ('tiktok_embed_url', 'https://www.tiktok.com/embed/v2/7636374767192263956')
ON CONFLICT (key) DO NOTHING;

-- Contact - CTA
INSERT INTO site_content (key, value) VALUES
    ('contact_cta_text', 'Prefer to talk? Call or WhatsApp us anytime.')
ON CONFLICT (key) DO NOTHING;

-- FAQ - Hero
INSERT INTO site_content (key, value) VALUES
    ('faq_hero_title', 'Frequently Asked Questions'),
    ('faq_hero_subtitle', 'Find answers to common questions about your stay')
ON CONFLICT (key) DO NOTHING;

-- FAQ - CTA
INSERT INTO site_content (key, value) VALUES
    ('faq_default_fallback', 'Still Have Questions?'),
    ('faq_cta_text', 'Our team is here to help you with any inquiries or special requests'),
    ('faq_whatsapp_label', 'WhatsApp Us'),
    ('faq_email_label', 'Email Us')
ON CONFLICT (key) DO NOTHING;

-- FAQ - Quick Links
INSERT INTO site_content (key, value) VALUES
    ('faq_quicklinks_heading', 'Quick Links'),
    ('faq_quicklink_book', 'Book a Room'),
    ('faq_quicklink_menu', 'View Menu'),
    ('faq_quicklink_contact', 'Contact Us'),
    ('faq_quicklink_about', 'About Us')
ON CONFLICT (key) DO NOTHING;

-- Cafe - Hero
INSERT INTO site_content (key, value) VALUES
    ('cafe_hero_title', 'Highlands Cafe'),
    ('cafe_hero_subtitle', 'Savor authentic local cuisine with breathtaking mountain views'),
    ('cafe_hero_btn_reserve', 'Call to Reserve'),
    ('cafe_hero_btn_menu', 'View Menu')
ON CONFLICT (key) DO NOTHING;

-- Cafe - Description
INSERT INTO site_content (key, value) VALUES
    ('cafe_description', 'Our on-site cafe serves fresh, locally-sourced dishes prepared with love. Start your day with a hearty breakfast or enjoy a relaxing meal while taking in the stunning highland scenery.'),
    ('cafe_hours', 'Open Daily')
ON CONFLICT (key) DO NOTHING;

-- Cafe - Menu
INSERT INTO site_content (key, value) VALUES
    ('cafe_featured_heading', 'Featured Dishes'),
    ('cafe_full_menu_heading', 'Full Menu'),
    ('cafe_featured_empty', 'Featured dishes will be displayed here'),
    ('cafe_menu_empty', 'Menu coming soon!'),
    ('cafe_view_full_menu_btn', 'View Full Menu'),
    ('cafe_menu_card_text', 'Click to view our detailed menu card')
ON CONFLICT (key) DO NOTHING;

-- Cafe - CTA
INSERT INTO site_content (key, value) VALUES
    ('cafe_cta_heading', 'Visit Us Today'),
    ('cafe_cta_text', 'Experience the warmth of highland hospitality and authentic flavors'),
    ('cafe_cta_btn_reserve', 'Call to Reserve'),
    ('cafe_cta_btn_room', 'Book a Room')
ON CONFLICT (key) DO NOTHING;

-- Rooms - Hero
INSERT INTO site_content (key, value) VALUES
    ('rooms_section_label', 'Our Accommodations'),
    ('rooms_hero_title', 'Experience Premium Comfort & Serenity'),
    ('rooms_hero_desc', 'Handpicked rooms designed for ultimate relaxation. Each space offers a unique blend of local charm and modern amenities.')
ON CONFLICT (key) DO NOTHING;

-- Rooms - Search & Filters
INSERT INTO site_content (key, value) VALUES
    ('rooms_search_placeholder', 'Search rooms by name, number, type...'),
    ('rooms_filter_btn', 'Filters'),
    ('rooms_filter_heading', 'Filter Rooms'),
    ('rooms_filter_ac_label', 'AC / Non-AC'),
    ('rooms_filter_ac_all', 'All'),
    ('rooms_filter_ac_ac', 'Air Conditioning (AC)'),
    ('rooms_filter_ac_nonac', 'Non-AC'),
    ('rooms_filter_type_label', 'Room Type'),
    ('rooms_filter_type_all', 'All'),
    ('rooms_filter_type_single', 'Single Room'),
    ('rooms_filter_type_double', 'Double Room'),
    ('rooms_filter_min_price', 'Min Price (NPR)'),
    ('rooms_filter_max_price', 'Max Price (NPR)'),
    ('rooms_filter_clear', 'Clear all filters'),
    ('rooms_no_results', 'No rooms match your criteria.'),
    ('rooms_no_rooms', 'No rooms available at the moment. Please check back later.'),
    ('rooms_count_found', '{count} room(s) found'),
    ('rooms_view_details', 'View Details')
ON CONFLICT (key) DO NOTHING;

-- Rooms - Labels
INSERT INTO site_content (key, value) VALUES
    ('rooms_status_available', 'Available'),
    ('rooms_label_guests', 'Guests'),
    ('rooms_label_people', 'People'),
    ('rooms_label_bed', 'Bed Type'),
    ('rooms_label_night', '/night'),
    ('rooms_label_npr', 'NPR'),
    ('rooms_label_book', 'Book Now'),
    ('rooms_label_unavailable', 'Unavailable'),
    ('rooms_label_floor', 'Floor'),
    ('rooms_label_featured', 'Featured'),
    ('rooms_label_limited', 'Limited Availability'),
    ('rooms_label_booked', 'Booked'),
    ('rooms_label_maintenance', 'Under Maintenance'),
    ('rooms_label_more', '+{count} more'),
    ('rooms_label_ac', 'AC'),
    ('rooms_label_nonac', 'Non-AC'),
    ('rooms_type_fallback', 'Standard Room'),
    ('rooms_bed_fallback', 'King Size')
ON CONFLICT (key) DO NOTHING;

-- Room Details - Headings
INSERT INTO site_content (key, value) VALUES
    ('roomdetails_desc_heading', 'Description'),
    ('roomdetails_amenities_heading', 'Room Amenities'),
    ('roomdetails_policies_heading', 'Policies & Notes'),
    ('roomdetails_reviews_heading', 'Guest Reviews'),
    ('roomdetails_reserve_heading', 'Reserve Your Stay'),
    ('roomdetails_capacity_label', 'CAPACITY'),
    ('roomdetails_size_label', 'SIZE'),
    ('roomdetails_bedtype_label', 'BED TYPE'),
    ('roomdetails_availability_label', 'AVAILABILITY'),
    ('roomdetails_per_night', 'per night'),
    ('roomdetails_guests_suffix', 'Guests'),
    ('roomdetails_checkin_heading', 'Check-in / Check-out'),
    ('roomdetails_cancel_heading', 'Cancellation Policy'),
    ('roomdetails_checkin_text', 'Check-in: {checkin} | Check-out: {checkout}'),
    ('roomdetails_cancel_text', 'Free cancellation up to 12 hours before check-in.'),
    ('roomdetails_no_reviews_heading', 'No reviews yet'),
    ('roomdetails_no_reviews_text', 'Be one of our first guests to share your experience at Highlands Cafe & Motel Inn!'),
    ('roomdetails_amenity_fallback', 'High speed WiFi, Air Conditioning, Smart TV, Room Service, Mini Bar, Daily Housekeeping'),
    ('roomdetails_type_fallback', 'Standard Room'),
    ('roomdetails_room_number_label', 'Room #{number}'),
    ('roomdetails_floor_label', 'Floor {floor}'),
    ('roomdetails_no_ac_label', 'Non-AC'),
    ('roomdetails_ac_label', 'AC')
ON CONFLICT (key) DO NOTHING;

-- Room Details - Sidebar
INSERT INTO site_content (key, value) VALUES
    ('room_sidebar_feature_1', 'Instant confirmation'),
    ('room_sidebar_feature_2', 'Safe and secure payments'),
    ('room_sidebar_feature_3', 'Best price guaranteed'),
    ('room_back_link', 'Back to All Rooms'),
    ('room_discover_heading', 'Discover Other Rooms'),
    ('room_book_this_room', 'Book This Room'),
    ('room_no_credit_card_text', 'No credit card required now'),
    ('room_unavailable_maintenance', 'Unavailable (Maintenance)'),
    ('cancel_policy', 'Free cancellation up to 12 hours before check-in.')
ON CONFLICT (key) DO NOTHING;

-- Gallery
INSERT INTO site_content (key, value) VALUES
    ('gallery_heading', 'Gallery'),
    ('gallery_subtitle', 'A visual journey through Highlands Cafe & Motel Inn'),
    ('gallery_filter_all', 'All Photos'),
    ('gallery_filter_gallery', 'Gallery'),
    ('gallery_filter_exterior', 'Exterior & Property'),
    ('gallery_filter_other', 'Other'),
    ('gallery_empty_heading', 'No photos yet'),
    ('gallery_empty_text', 'Gallery photos will appear here once added.'),
    ('gallery_img_fallback', 'Gallery image')
ON CONFLICT (key) DO NOTHING;

-- Privacy
INSERT INTO site_content (key, value) VALUES
    ('privacy_hero_heading', 'Privacy Policy'),
    ('privacy_hero_subtitle', 'Your privacy is important to us. Learn how we protect your information.'),
    ('privacy_last_updated_label', 'Last Updated'),
    ('privacy_content', ''),
    ('privacy_cta_heading', 'Your Privacy Matters'),
    ('privacy_cta_text', 'By using our website and services, you acknowledge that you have read and understood this Privacy Policy. We are committed to protecting your privacy.'),
    ('privacy_cta_btn_book', 'Book Your Stay'),
    ('privacy_cta_btn_contact', 'Contact Privacy Officer'),
    ('privacy_not_found_text', 'Privacy policy content is being updated. Please check back later.')
ON CONFLICT (key) DO NOTHING;

-- Terms
INSERT INTO site_content (key, value) VALUES
    ('terms_hero_heading', 'Terms of Service'),
    ('terms_hero_subtitle', 'Please read these terms carefully before booking your stay'),
    ('terms_last_updated_label', 'Last Updated'),
    ('terms_content', ''),
    ('terms_cta_heading', 'Your Agreement'),
    ('terms_cta_text', 'By making a reservation or using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.'),
    ('terms_cta_btn_book', 'Book Your Stay'),
    ('terms_cta_btn_contact', 'Contact Us'),
    ('terms_not_found_text', 'Terms of service content is being updated. Please check back later.')
ON CONFLICT (key) DO NOTHING;

-- Global - Navbar
INSERT INTO site_content (key, value) VALUES
    ('site_name', 'Highlands Cafe & Motel Inn'),
    ('navbar_phone', '+977 9763215874'),
    ('navbar_email', 'highlandscafemotelinn@gmail.com')
ON CONFLICT (key) DO NOTHING;

-- Global - Footer
INSERT INTO site_content (key, value) VALUES
    ('footer_text', 'Experience cozy comfort in the heart of the highlands. Your perfect retreat with breathtaking views, warm hospitality, and unforgettable memories waiting to be created.'),
    ('footer_quicklinks_heading', 'Quick Links'),
    ('footer_getintouch_heading', 'Get in Touch'),
    ('footer_connect_heading', 'Connect & Hours'),
    ('footer_operating_hours_heading', 'Operating Hours'),
    ('footer_premium_label', 'Premium Hospitality'),
    ('footer_phone_sublabel', 'Call & WhatsApp'),
    ('footer_email_sublabel', 'Quick Response'),
    ('footer_location_sublabel', 'Karnali Province, Nepal'),
    ('footer_rights', 'All rights reserved.'),
    ('footer_made_with', 'Made with'),
    ('footer_made_in_nepal', 'in Nepal')
ON CONFLICT (key) DO NOTHING;

-- Footer - Social
INSERT INTO site_content (key, value) VALUES
    ('footer_social_facebook', 'https://www.facebook.com/profile.php?id=61587029831121'),
    ('footer_social_instagram', 'https://www.instagram.com/highlandscafemotel?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=='),
    ('footer_social_whatsapp', 'https://wa.me/9779763215874'),
    ('footer_social_tiktok', 'https://www.tiktok.com/@highlandscafe1')
ON CONFLICT (key) DO NOTHING;

-- Footer - Amenities
INSERT INTO site_content (key, value) VALUES
    ('footer_amenity_1_label', 'Free WiFi'),
    ('footer_amenity_1_icon', 'Wifi'),
    ('footer_amenity_2_label', 'Free Parking'),
    ('footer_amenity_2_icon', 'Car'),
    ('footer_amenity_3_label', '24/7 Motel'),
    ('footer_amenity_3_icon', 'Coffee'),
    ('footer_amenity_4_label', 'Premium Care'),
    ('footer_amenity_4_icon', 'Heart')
ON CONFLICT (key) DO NOTHING;

-- Footer - Bottom
INSERT INTO site_content (key, value) VALUES
    ('footer_bottom_faq', 'FAQ'),
    ('footer_bottom_privacy', 'Privacy Policy'),
    ('footer_bottom_terms', 'Terms of Service')
ON CONFLICT (key) DO NOTHING;

-- Footer - Hours
INSERT INTO site_content (key, value) VALUES
    ('footer_hours_checkin_label', 'Check-in:'),
    ('footer_hours_checkout_label', 'Check-out:'),
    ('footer_hours_cafe_label', 'Cafe Hours:'),
    ('checkin_time', '2:00 PM'),
    ('checkout_time', '12:00 PM'),
    ('cafe_hours_text', '7:00 AM - 8:00 PM')
ON CONFLICT (key) DO NOTHING;

-- Buttons
INSERT INTO site_content (key, value) VALUES
    ('btn_book_stay', 'Book Your Stay'),
    ('btn_book_now', 'Book Now'),
    ('btn_view_menu', 'View Menu'),
    ('btn_view_rooms', 'View All Rooms')
ON CONFLICT (key) DO NOTHING;

-- Booking
INSERT INTO site_content (key, value) VALUES
    ('booking_sidebar_features', 'Instant confirmation\nSafe and secure payments\nBest price guaranteed'),
    -- Booking flow
    ('booking_select_dates', 'Select Your Dates'),
    ('booking_checkin', 'Check-in Date'),
    ('booking_checkout', 'Check-out Date'),
    ('booking_guests', 'Guests'),
    ('booking_guest', 'Guest'),
    ('booking_guests_plural', 'Guests'),
    ('booking_available_rooms', 'Available Rooms'),
    ('booking_night', 'night'),
    ('booking_nights', 'nights'),
    ('booking_no_rooms', 'No rooms available for selected dates.'),
    ('booking_no_rooms_sub', 'Please try different dates.'),
    ('booking_up_to', 'Up to'),
    ('booking_guests_suffix', 'guests'),
    ('booking_ac_label', 'AC'),
    ('booking_nonac_label', 'Non-AC'),
    ('booking_floor_prefix', 'Floor'),
    ('booking_night_suffix', '/night'),
    ('booking_off_label', '% OFF'),
    ('booking_select_room_btn', 'Select Room'),
    ('booking_guest_heading', 'Guest Information'),
    ('booking_checkin_label', 'Check-in:'),
    ('booking_checkout_label', 'Check-out:'),
    ('booking_guests_label', 'Guests:'),
    ('booking_total_label', 'Total:'),
    ('booking_name_label', 'Full Name *'),
    ('booking_name_placeholder', 'John Doe'),
    ('booking_email_label', 'Email *'),
    ('booking_email_placeholder', 'john@example.com'),
    ('booking_phone_label', 'Phone *'),
    ('booking_phone_placeholder', '98XXXXXXXX'),
    ('booking_payment_method_label', 'Payment Method'),
    ('booking_pay_at_property', 'Pay at Property'),
    ('booking_pay_at_property_desc', 'Pay 60% advance now, remaining 40% at the property'),
    ('booking_fonepay_qr', 'Fonepay QR'),
    ('booking_fonepay_qr_desc', 'Pay instantly by scanning a QR code with Fonepay app'),
    ('booking_fonepay_web', 'Fonepay Web Payment'),
    ('booking_fonepay_web_desc', 'Pay online via Fonepay web payment gateway'),
    ('booking_breakdown_heading', 'Payment Breakdown'),
    ('booking_total_amount', 'Total Booking Amount'),
    ('booking_advance_required', 'Advance Payment Required Now (60%)'),
    ('booking_balance_due', 'Remaining Balance at Property (40%)'),
    ('booking_policy_heading', 'Pay at Property Policy'),
    ('booking_policy_line1', '• 60% advance payment is required to confirm your reservation.'),
    ('booking_policy_line2', '• Remaining 40% can be paid at the property.'),
    ('booking_policy_line3', '• Reservations are not guaranteed until the advance payment is successfully completed.'),
    ('booking_policy_disclaimer', 'By proceeding with this booking, you agree to pay a non-refundable 60% advance deposit if cancellation occurs within 12 hours of check-in. Cancellations made at least 12 hours before check-in are eligible for a refund of the advance payment.'),
    ('booking_back_btn', 'Back'),
    ('booking_processing', 'Processing...'),
    ('booking_confirm_btn', 'Confirm Booking'),
    ('booking_payment_error', 'Payment Error'),
    ('booking_try_again', 'Try Again'),
    ('booking_return_home', 'Return Home'),
    ('booking_scan_to_pay', 'Scan to Pay'),
    ('booking_scan_instructions_prefix', 'Open your'),
    ('booking_fonepay_name', 'Fonepay'),
    ('booking_scan_instructions_suffix', 'app and scan the QR code below to complete payment.'),
    ('booking_amount_label', 'Amount'),
    ('booking_npr', 'NPR'),
    ('booking_reference_label', 'Reference'),
    ('booking_monitoring_active', 'Real-time monitoring active'),
    ('booking_connecting_monitor', 'Connecting to payment monitor...'),
    ('booking_periodic_verification', 'Using periodic verification'),
    ('booking_auto_checking', 'Auto-checking every 8 seconds...'),
    ('booking_verifying', 'Verifying...'),
    ('booking_paid_verify_btn', 'I''ve Paid - Verify'),
    ('booking_cancel_return', 'Cancel & Return Home')
ON CONFLICT (key) DO NOTHING;

-- Cafe - Full Menu Image
INSERT INTO site_content (key, value) VALUES
    ('view_full_menu_image', '')
ON CONFLICT (key) DO NOTHING;

-- SEO - Home
INSERT INTO site_content (key, value) VALUES
    ('home_meta_title', 'Highlands Motel & Cafe | Home'),
    ('home_meta_desc', 'Experience a warm, cozy stay at Highlands Motel & Cafe in Surkhet. Book comfortable rooms and enjoy great food.'),
    ('about_meta_title', 'About Us | Highlands Motel & Cafe'),
    ('about_meta_desc', 'Learn the story behind Highlands Motel & Cafe in Surkhet.'),
    ('contact_meta_title', 'Contact Us | Highlands Motel & Cafe'),
    ('contact_meta_desc', 'Get in touch. Call, email, or visit us in Surkhet, Nepal.'),
    ('faq_meta_title', 'FAQ | Highlands Motel & Cafe'),
    ('faq_meta_desc', 'Find answers to frequently asked questions about booking, rooms, amenities, check-in/out, payments, and more.'),
    ('rooms_meta_title', 'Rooms | Highlands Motel & Cafe'),
    ('rooms_meta_desc', 'Browse our comfortable rooms in Surkhet, Nepal.'),
    ('cafe_meta_title', 'Cafe Menu | Highlands Motel & Cafe'),
    ('cafe_meta_desc', 'Savor authentic local cuisine at our cafe in Surkhet.'),
    ('gallery_meta_title', 'Gallery | Highlands Motel & Cafe'),
    ('gallery_meta_desc', 'Explore our photo gallery showcasing rooms, cafe, exterior views, and the beautiful surroundings.'),
    ('booking_meta_title', 'Book Your Stay | Highlands Motel & Cafe'),
    ('booking_meta_desc', 'Reserve your room at Highlands Motel & Cafe in Surkhet.'),
    ('terms_meta_title', 'Terms of Service | Highlands Motel & Cafe'),
    ('terms_meta_desc', 'Read the Terms of Service. Learn about booking policies, cancellation, payment terms, and guest responsibilities.'),
    ('privacy_meta_title', 'Privacy Policy | Highlands Motel & Cafe'),
    ('privacy_meta_desc', 'Read our Privacy Policy. Learn how we collect, use, and protect your personal information.')
ON CONFLICT (key) DO NOTHING;

-- TikTok
INSERT INTO site_content (key, value) VALUES
    ('tiktok_username', 'highlandscafe1'),
    ('tiktok_heading', 'Latest from TikTok'),
    ('tiktok_follow_prefix', 'Follow @'),
    ('tiktok_description', 'for behind-the-scenes content and updates'),
    ('tiktok_view_all', 'View all on TikTok')
ON CONFLICT (key) DO NOTHING;

-- Confirmation
INSERT INTO site_content (key, value) VALUES
    ('confirmation_room_fallback', 'Selected Room'),
    ('confirmation_heading', 'Reservation Confirmed'),
    ('confirmation_loading_text', 'Loading your reservation details...'),
    ('confirmation_not_found', 'Reservation Not Found'),
    ('confirmation_not_found_text', 'We couldn''t find your reservation details. Please contact us for assistance.'),
    ('confirmation_return_home', 'Return Home'),
    ('confirmation_advance_label', 'Advance Payment Reservation'),
    ('confirmation_fonepay_qr_label', 'Fonepay QR'),
    ('confirmation_fonepay_web_label', 'Fonepay Web'),
    ('confirmation_reserved_heading', 'Reservation Confirmed'),
    ('confirmation_success_text_pay_at_property_true', 'Your reservation has been successfully created. Please review your reservation details below.'),
    ('confirmation_success_text_pay_at_property_false', 'Your payment has been received and your reservation is confirmed.'),
    ('confirmation_ref_label', 'Reservation Reference'),
    ('confirmation_details_heading', 'Reservation Details'),
    ('confirmation_room_label', 'Room'),
    ('confirmation_room_type_label', 'Room Type'),
    ('confirmation_checkin_label', 'Check-In Date'),
    ('confirmation_checkout_label', 'Check-Out Date'),
    ('confirmation_nights_label', 'Number of Nights'),
    ('confirmation_night', 'Night'),
    ('confirmation_nights', 'Nights'),
    ('confirmation_guests_label', 'Number of Guests'),
    ('confirmation_guest', 'Guest'),
    ('confirmation_guests', 'Guests'),
    ('confirmation_guest_heading', 'Guest Information'),
    ('confirmation_guest_name_label', 'Guest Name'),
    ('confirmation_phone_label', 'Phone Number'),
    ('confirmation_payment_heading', 'Payment Information'),
    ('confirmation_transaction_id_label', 'Transaction ID:'),
    ('confirmation_total_label', 'Reservation Total'),
    ('confirmation_npr_prefix', 'NPR'),
    ('confirmation_advance_label_short', 'Advance Payment Required'),
    ('confirmation_advance_percent', '60% of reservation total'),
    ('confirmation_balance_label_short', 'Balance Due At Check-In'),
    ('confirmation_balance_percent', '40% of reservation total'),
    ('confirmation_policy_secured', 'Your reservation has been secured.'),
    ('confirmation_policy_advance_required', 'The advance payment amount is required to confirm the booking.'),
    ('confirmation_policy_balance_at_property', 'The remaining balance will be paid during check-in at the property.'),
    ('confirmation_payment_status_label', 'Payment Status'),
    ('confirmation_paid_label', 'Paid'),
    ('confirmation_amount_paid_label', 'Amount Paid'),
    ('confirmation_payment_success_text', 'Payment completed successfully via'),
    ('confirmation_help_heading', 'Need Assistance?'),
    ('confirmation_hotel_name', 'Highlands Motel & Cafe'),
    ('confirmation_location', 'Surkhet, Nepal'),
    ('confirmation_phone_fallback', '+977-98XXXXXXXX'),
    ('confirmation_email_fallback', 'info@highlands-motel.com'),
    ('confirmation_call_btn', 'Call Hotel'),
    ('confirmation_email_btn', 'Send Email'),
    ('confirmation_important_heading', 'Important Information'),
    ('confirmation_policy_id_required', '• Valid government-issued ID required at check-in.'),
    ('confirmation_policy_times', '• Check-in: 2:00 PM | Check-out: 12:00 PM.'),
    ('confirmation_policy_changes', '• Cancellations or changes may affect the advance payment amount.'),
    ('confirmation_print_btn', 'Print Confirmation'),
    ('confirmation_return_home_btn', 'Return Home')
ON CONFLICT (key) DO NOTHING;
