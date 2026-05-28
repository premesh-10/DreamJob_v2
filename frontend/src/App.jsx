import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// User pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Wallet from './pages/Wallet';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import Interviews from './pages/Interviews';
import Bookings from './pages/Bookings';
import Pricing from './pages/Pricing';
import Success from './pages/Success';

// Admin pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/admin/Users';
import AdminSellers from './pages/admin/Sellers';
import AdminPayments from './pages/admin/Payments';
import AdminCourses from './pages/admin/Courses';
import AdminBookings from './pages/admin/Bookings';
import AdminWallet from './pages/admin/Wallet';
import AdminSubscriptions from './pages/admin/Subscriptions';
import AdminCoupons from './pages/admin/Coupons';
import AdminFeedback from './pages/admin/Feedback';
import AdminNotifications from './pages/admin/Notifications';
import AdminReports from './pages/admin/Reports';
import AdminSecurity from './pages/admin/Security';
import AdminSettings from './pages/admin/Settings';
import AdminInterviews from './pages/admin/Interviews';
import AdminReviews from './pages/admin/Reviews';

// User feature pages
import Notifications from './pages/Notifications';
import FeedbackPage from './pages/FeedbackPage';

// Seller Portal
import SellerLogin from './pages/seller/SellerLogin';
import SellerRegister from './pages/seller/SellerRegister';
import SellerOverview from './pages/seller/SellerOverview';
import MyCourses from './pages/seller/MyCourses';
import InterviewSchedule from './pages/seller/InterviewSchedule';
import RevenueAnalytics from './pages/seller/RevenueAnalytics';
import SellerWallet from './pages/seller/SellerWallet';
import SellerOrders from './pages/seller/SellerOrders';
import SellerStudents from './pages/seller/SellerStudents';
import SellerProfile from './pages/seller/SellerProfile';

function App() {
  return (
    <>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
          <Routes>
            {/* ── User Routes ── */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetails />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/history" element={<Bookings />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/success" element={<Success />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/feedback" element={<FeedbackPage />} />

            {/* ── Admin Routes ── */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/sellers" element={<AdminSellers />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/courses" element={<AdminCourses />} />
            <Route path="/admin/interviews" element={<AdminInterviews />} />
            <Route path="/admin/bookings" element={<AdminBookings />} />
            <Route path="/admin/wallet" element={<AdminWallet />} />
            <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
            <Route path="/admin/coupons" element={<AdminCoupons />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/reports" element={<AdminReports />} />
            <Route path="/admin/security" element={<AdminSecurity />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/reviews" element={<AdminReviews />} />

            {/* ── Seller Portal Routes ── */}
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route path="/seller/register" element={<SellerRegister />} />
            <Route path="/seller" element={<SellerOverview />} />
            <Route path="/seller/courses" element={<MyCourses />} />
            <Route path="/seller/interviews" element={<InterviewSchedule />} />
            <Route path="/seller/revenue" element={<RevenueAnalytics />} />
            <Route path="/seller/wallet" element={<SellerWallet />} />
            <Route path="/seller/orders" element={<SellerOrders />} />
            <Route path="/seller/students" element={<SellerStudents />} />
            <Route path="/seller/profile" element={<SellerProfile />} />
          </Routes>
        </div>
      </Router>
    </>
  );
}

export default App;
