# Deployment Guide for Highlands Cafe & Motel Inn

## 🚀 Overview

This guide explains how to deploy the Highlands Cafe & Motel Inn website to production. The project is built with React, Vite, and InsForge as the backend.

## 🛠 Prerequisites

1.  **InsForge Account**: Ensure your InsForge project is setup with the required tables and policies.
2.  **Hosting Platform**: We recommend Vercel or Netlify for hosting the frontend.
3.  **Source Code**: Ensure you have pushed your code to a GitHub repository.

## 📦 Build for Production

Before deploying, always test the production build locally:

```bash
npm run build
npm run preview
```

Wait for the build to complete and the preview server to start. Visit `http://localhost:4173` to verify functionality.

## 🌐 Deploy to Vercel (Recommended)

1.  **Connect to GitHub**: Link your GitHub account to Vercel.
2.  **Import Project**: Select the `highlands-motel` repository.
3.  **Configuration**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `./` (or leave default)
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `dist`
4.  **Environment Variables**:
    Add the following environment variables from your `.env` file:
    *   `VITE_INSFORGE_BASE_URL`: Your InsForge project URL
    *   `VITE_INSFORGE_ANON_KEY`: Your InsForge anon key
5.  **Deploy**: Click "Deploy" and wait for the build to complete.

## 🌐 Deploy to Netlify

1.  **Connect to GitHub**: Link your GitHub account to Netlify.
2.  **Import Project**: Select the `highlands-motel` repository.
3.  **Build Settings**:
    *   **Build command**: `npm run build`
    *   **Publish directory**: `dist`
4.  **Environment Variables**:
    Go to **Site settings > Build & deploy > Environment** and add:
    *   `VITE_INSFORGE_BASE_URL`
    *   `VITE_INSFORGE_ANON_KEY`
5.  **Deploy**: Click "Deploy site".

## 🛡️ Database Security (RLS)

Ensure Row Level Security (RLS) policies are active on your InsForge tables to protect meaningful data.

Suggested Policies:
*   **public_read_rooms**: Enable read access for `anon` role on `rooms`, `room_images`, `site_images`, `site_content`, `cafe_menu_categories`, `cafe_menu_items`.
*   **public_create_bookings**: Enable insert access for `anon` role on `bookings` (for guest checkout).
*   **admin_full_access**: Enable full access for `authenticated` (admin) role on all tables.

## 🧪 Post-Deployment Verification

1.  **Check Public Pages**: Verify Home, Rooms, Cafe, and Contact pages load correctly.
2.  **Test Booking Flow**: Create a test booking and ensure it appears in the admin panel.
3.  **Admin Login**: specific admin email/password.
4.  **Image Loading**: Ensure images load from InsForge storage or external URLs.

## 📧 Support

For any deployment issues, contact the development team at dev@highlandsmotel.com.
