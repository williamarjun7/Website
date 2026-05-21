# Highlands Cafe & Motel Inn - Hotel Booking Website

A production-ready hotel room booking website built with React, Vite, Tailwind CSS, and InsForge backend.

## 🎨 Design System

This project uses the **UI/UX Pro Max** design system with:
- **Color Palette**: Warm browns and creams (#92400E, #B45309, #FEF3C7)
- **Typography**: Fredoka (headings) + Nunito (body)
- **Style**: Liquid Glass with smooth transitions and fluid animations
- **Pattern**: Hero-centric with social proof

## ✨ Features

### Public Website
- **Home Page**: Auto-playing hero slider, room previews, cafe highlight, features
- **Rooms Page**: Grid layout with room cards, image galleries, pricing
- **Booking Flow**: 3-step checkout process
  1. Date selection with real-time availability
  2. Guest information form
  3. Booking confirmation
- **Cafe Page**: Menu display by categories with pricing
- **Contact Page**: Contact info, quick message form, Google Maps

### Booking System
- ✅ Real-time availability checking
- ✅ Date conflict prevention (bookings + blocked dates)
- ✅ Guest checkout (no login required)
- ✅ Multiple payment options (pay at property / online)
- ✅ Booking confirmation with unique ID
- ✅ Price calculation based on nights

### Admin Panel
- ✅ Dashboard with metrics and booking status charts
- ✅ Room management (CRUD + images)
- ✅ Booking management (view, update status, search, paginate)
- ✅ Menu management (categories + items CRUD)
- ✅ Image upload to InsForge Storage
- ✅ Site content editor
- ✅ Auth (login, signup, OTP verify, route guard)

### Payment & Notifications
- ✅ Fonepay payment gateway (QR + Web payment)
- ✅ Payment verification (auto + manual)
- ✅ Email notifications (booking confirmation via Resend)
- ✅ CSV export of bookings

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite (Rolldown)
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router DOM 7
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Backend
- **BaaS**: InsForge
- **Database**: PostgreSQL (via InsForge)
- **Auth**: InsForge Auth
- **Storage**: InsForge Storage

## 📁 Project Structure

```
src/
├── components/
│   ├── common/          # Navbar, Footer
│   ├── home/            # Home page components
│   ├── rooms/           # Room components
│   ├── booking/         # Booking flow components
│   ├── cafe/            # Cafe components
│   └── admin/           # Admin panel components
├── pages/
│   ├── Home.tsx
│   ├── Rooms.tsx
│   ├── Booking.tsx
│   ├── Cafe.tsx
│   ├── Contact.tsx
│   └── admin/           # Admin pages
├── services/
│   ├── insforge.ts      # InsForge client
│   ├── roomService.ts   # Room operations
│   ├── bookingService.ts # Booking operations
│   ├── menuService.ts   # Menu operations
│   ├── contentService.ts # Site content
│   └── authService.ts   # Authentication
├── utils/               # Utility functions
├── App.tsx
├── main.tsx
└── index.css
```

## 🗄️ Database Schema

### Tables
- `rooms` - Room information
- `room_images` - Room image gallery
- `bookings` - Guest bookings
- `blocked_dates` - Unavailable dates per room
- `admin_users` - Admin authentication
- `site_images` - Hero, gallery, cafe images
- `cafe_menu_categories` - Menu categories
- `cafe_menu_items` - Menu items
- `site_content` - Editable site content

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- InsForge account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd highlands-motel
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
Create a `.env` file:
```env
VITE_INSFORGE_BASE_URL=your_insforge_url
VITE_INSFORGE_ANON_KEY=your_anon_key
```

4. **Run development server**
```bash
npm run dev
```

5. **Build for production**
```bash
npm run build
```

## 📊 Database Setup

The database schema is automatically created. Sample data is seeded including:
- 4 sample rooms (Highland Suite, Cozy Double Room, Deluxe Single, Family Suite)
- Menu categories (Breakfast, Lunch & Dinner, Beverages, Desserts)
- Sample menu items
- Site content (contact info, check-in/out times)

## 🎯 Key Features Implemented

### ✅ Implemented
- [x] Project setup with Vite + React + TypeScript
- [x] Design system implementation
- [x] Database schema creation
- [x] All service layers (rooms, bookings, menu, content, auth)
- [x] Public website pages (Home, Rooms, Cafe, Contact)
- [x] Complete booking flow with date selection + guest info + payment
- [x] Real-time availability checking
- [x] Responsive design (mobile-first)
- [x] Floating navbar with scroll effects
- [x] Footer with contact info and social links
- [x] Hero slider with auto-play
- [x] Room cards with image galleries
- [x] Menu display by categories
- [x] Google Maps integration
- [x] Admin authentication (login, signup, OTP verify, logout)
- [x] Admin dashboard with stats, charts, recent bookings
- [x] Room management (full CRUD with image gallery)
- [x] Booking management (view, filter, paginate, update status)
- [x] Menu management (categories + items CRUD with images)
- [x] Image upload to InsForge Storage
- [x] Site content editor (hero, about, contact, footer, FAQ)
- [x] Email notifications (booking confirmation via Resend)
- [x] CSV export of filtered bookings
- [x] Fonepay payment gateway (QR + Web + verification)

## 🎨 Design Guidelines

### Colors
- Primary: `#92400E` (Warm Brown)
- Secondary: `#B45309` (Golden Brown)
- Background: `#FEF3C7` (Cream)
- Text: `#78350F` (Dark Brown)

### Typography
- Headings: Fredoka (playful, friendly)
- Body: Nunito (clean, readable)

### Components
- All interactive elements have `cursor-pointer`
- Smooth transitions (200-300ms)
- Hover states with visual feedback
- No layout-shifting animations
- Accessible focus states

## 📱 Responsive Breakpoints
- Mobile: 375px+
- Tablet: 768px+
- Desktop: 1024px+
- Large: 1440px+

## 🔒 Security
- Row-level security (RLS) on all tables
- Parameterized queries via InsForge SDK
- Input validation (client + server)
- XSS prevention (React built-in)
- CORS configured via InsForge

## 📈 Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90
- Mobile Performance: > 85

## 🤝 Contributing
This is a production project for Highlands Cafe & Motel Inn.

## 📄 License
All rights reserved © 2026 Highlands Cafe & Motel Inn

## 📞 Support
- Email: info@highlandsmotel.com
- Phone: +977 98xxxxxxxx
- Address: Khajura Birendranagar, Surkhet

---

Built with ❤️ using React, Vite, Tailwind CSS, and InsForge

# Website
