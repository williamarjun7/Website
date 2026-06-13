import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';

// Public Pages (lazy loaded)
const Home = lazy(() => import('./pages/Home'));
const Rooms = lazy(() => import('./pages/Rooms'));
const Booking = lazy(() => import('./pages/Booking'));
const Cafe = lazy(() => import('./pages/Cafe'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const RoomDetails = lazy(() => import('./pages/RoomDetails'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));

// Admin Pages (lazy loaded)
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminGate = lazy(() => import('./pages/admin/AdminGate'));
const AdminSignup = lazy(() => import('./pages/admin/AdminSignup'));
const AdminVerify = lazy(() => import('./pages/admin/AdminVerify'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Bookings = lazy(() => import('./pages/admin/Bookings'));
const AdminRooms = lazy(() => import('./pages/admin/Rooms'));
const Menu = lazy(() => import('./pages/admin/Menu'));
const Images = lazy(() => import('./pages/admin/Images'));
const ContentEditor = lazy(() => import('./pages/admin/ContentEditor'));

const PaymentRecovery = lazy(() => import('./pages/admin/PaymentRecovery'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const PublicLayout = () => (
  <div className="flex flex-col min-h-screen">
    <Navbar />
    <main className="flex-grow">
      <Suspense fallback={<LoadingFallback />}>
        <Outlet />
      </Suspense>
    </main>
    <Footer />
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<RoomDetails />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/cafe" element={<Cafe />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/payment-result" element={<PaymentResult />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<Suspense fallback={<LoadingFallback />}><AdminGate /></Suspense>}>
            <Route path="login" element={<Suspense fallback={<LoadingFallback />}><AdminLogin /></Suspense>} />
            <Route path="signup" element={<Suspense fallback={<LoadingFallback />}><AdminSignup /></Suspense>} />
            <Route path="verify" element={<Suspense fallback={<LoadingFallback />}><AdminVerify /></Suspense>} />
            <Route element={<Suspense fallback={<LoadingFallback />}><AdminLayout /></Suspense>}>
              <Route index element={<Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>} />
              <Route path="dashboard" element={<Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>} />
              <Route path="bookings" element={<Suspense fallback={<LoadingFallback />}><Bookings /></Suspense>} />
              <Route path="rooms" element={<Suspense fallback={<LoadingFallback />}><AdminRooms /></Suspense>} />
              <Route path="menu" element={<Suspense fallback={<LoadingFallback />}><Menu /></Suspense>} />
              <Route path="images" element={<Suspense fallback={<LoadingFallback />}><Images /></Suspense>} />
              <Route path="content" element={<Suspense fallback={<LoadingFallback />}><ContentEditor /></Suspense>} />
              <Route path="payment-recovery" element={<Suspense fallback={<LoadingFallback />}><PaymentRecovery /></Suspense>} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

