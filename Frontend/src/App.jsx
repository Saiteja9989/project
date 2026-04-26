import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// Pages
import Landing   from './pages/Landing';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/AttendancePage';
import ResultsPage    from './pages/ResultsPage';
import TimetablePage  from './pages/TimetablePage';
import QRPage         from './pages/QRPage';
import FeedbackPage   from './pages/FeedbackPage';

/**
 * Check if a JWT token is expired.
 * Interview tip: JWT = 3 parts (header.payload.signature), base64 encoded.
 * The payload contains `exp` = expiry timestamp in seconds.
 */
const isTokenExpired = (token) => {
  try {
    const { exp } = jwtDecode(token);
    return Date.now() / 1000 > exp; // compare in seconds
  } catch {
    return true; // if decode fails, treat as expired
  }
};

/**
 * ProtectedRoute — wraps pages that require login.
 * If no valid token → redirect to search page.
 */
const ProtectedRoute = ({ token, children }) => {
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

/**
 * AppInner — has access to useNavigate (must be inside <Router>)
 */
const AppInner = () => {
  const [token, setToken] = useState(Cookies.get('token') || null);
  const navigate = useNavigate();
  const location = useLocation();

  // On app load: validate stored token
  useEffect(() => {
    const stored = Cookies.get('token');
    if (stored && isTokenExpired(stored)) {
      Cookies.remove('token');
      setToken(null);
      navigate('/');
    } else {
      setToken(stored || null);
    }
  }, []);

  // Periodic token expiry check every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = Cookies.get('token');
      if (stored && isTokenExpired(stored)) {
        Cookies.remove('token');
        setToken(null);
        navigate('/');
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    // AnimatePresence enables exit animations when a route unmounts
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>

        {/* Public routes */}
        <Route path="/"       element={<Landing setToken={setToken} />} />
        <Route path="/login"  element={<Login   setToken={setToken} />} />

        {/* Protected routes — require valid token */}
        <Route path="/dashboard" element={
          <ProtectedRoute token={token}>
            <Dashboard token={token} setToken={setToken} />
          </ProtectedRoute>
        }/>
        <Route path="/attendance" element={
          <ProtectedRoute token={token}>
            <AttendancePage token={token} />
          </ProtectedRoute>
        }/>
        <Route path="/results" element={
          <ProtectedRoute token={token}>
            <ResultsPage token={token} />
          </ProtectedRoute>
        }/>
        <Route path="/timetable" element={
          <ProtectedRoute token={token}>
            <TimetablePage token={token} />
          </ProtectedRoute>
        }/>
        <Route path="/qr" element={
          <ProtectedRoute token={token}>
            <QRPage token={token} />
          </ProtectedRoute>
        }/>
        <Route path="/feedback" element={
          <ProtectedRoute token={token}>
            <FeedbackPage token={token} />
          </ProtectedRoute>
        }/>

        {/* Legacy URL support */}
        <Route path="/user"   element={<Navigate to="/dashboard" replace />} />
        <Route path="/search" element={<Navigate to="/"          replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <Router>
    <AppInner />
  </Router>
);

export default App;
