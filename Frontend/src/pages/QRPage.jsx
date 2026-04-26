import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { baseUrl } from '../baseurl';

/**
 * QR PAGE — Displays student's Netra QR code for attendance scanning
 *
 * Flow:
 * 1. Fetch hall ticket number from /api/netraqr
 * 2. Use hall ticket to fetch the QR image from /api/fetchqr
 * 3. Cache the result in sessionStorage to avoid re-fetching every visit
 *
 * Interview tip:
 * sessionStorage is cleared when the browser tab closes.
 * It's perfect for per-session caches (not sensitive data like tokens).
 * Use localStorage for data that should survive across sessions.
 */

export default function QRPage({ token }) {
  const [hallticket, setHallticket] = useState('');
  const [qrUrl, setQrUrl]           = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    loadQR();
  }, []);

  const loadQR = async () => {
    try {
      setLoading(true);

      // Check session cache first (saves an API round-trip)
      const cachedQR = sessionStorage.getItem('netraQRCode');
      const cachedHT = sessionStorage.getItem('studentHallticket');

      if (cachedQR && cachedHT) {
        setQrUrl(cachedQR);
        setHallticket(cachedHT);
        return;
      }

      // Step 1: Get hall ticket from our backend
      const headers = { Authorization: `Bearer ${token}` };
      const htRes = await axios.post(
        `${baseUrl}/api/netraqr`,
        { method: '32' },
        { headers }
      );

      const ht = htRes.data?.hallticketno;
      if (!ht) throw new Error('No hall ticket in response');
      setHallticket(ht);

      // Step 2: Fetch QR image using hall ticket
      const qrRes = await axios.post(`${baseUrl}/api/fetchqr`, { hallticketno: ht });
      const imageUrl = qrRes.data?.imageUrl;
      if (!imageUrl) throw new Error('No QR image URL in response');

      setQrUrl(imageUrl);

      // Cache for this session
      sessionStorage.setItem('netraQRCode', imageUrl);
      sessionStorage.setItem('studentHallticket', ht);

    } catch (err) {
      setError('Could not load QR code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `QR_${hallticket || 'code'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = async () => {
    if (!qrUrl) return;
    try {
      await navigator.share({ title: 'My Netra QR Code', text: `Hall Ticket: ${hallticket}`, url: qrUrl });
    } catch {
      // Browser doesn't support share — silently fail
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bottom-nav-space">
      <Navbar token={token} />

      <div style={{ maxWidth: '400px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {loading ? (
          <QRSkeleton />
        ) : error ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>
            <button className="btn-primary" onClick={loadQR}>Retry</button>
          </div>
        ) : (
          <>
            {/* ─── Header ─── */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', marginBottom: '24px' }}
            >
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', marginBottom: '4px' }}>
                Netra QR Code
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Show this at attendance kiosk
              </div>
            </motion.div>

            {/* ─── QR Card ─── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="glass-card"
              style={{ padding: '24px', marginBottom: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Hall ticket number */}
              {hallticket && (
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Hall Ticket
                  </div>
                  <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.125rem', color: 'var(--text)', letterSpacing: '2px' }}>
                    {hallticket}
                  </div>
                </div>
              )}

              {/* QR Image — white background for scanner compatibility */}
              <div style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}>
                <img
                  src={qrUrl}
                  alt="Netra QR Code"
                  style={{ width: '200px', height: '200px', display: 'block', objectFit: 'contain' }}
                />
              </div>

              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '14px', textAlign: 'center' }}>
                Scan at the attendance machine
              </div>
            </motion.div>

            {/* ─── Action Buttons ─── */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ display: 'flex', gap: '12px', width: '100%' }}
            >
              <button
                className="btn-primary"
                onClick={handleDownload}
                style={{ flex: 1, gap: '6px' }}
              >
                ↓ Download
              </button>
              {/* Only show share if Web Share API is available (mainly mobile) */}
              {navigator.share && (
                <button
                  onClick={handleShare}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    cursor: 'pointer',
                  }}
                >
                  ↑ Share
                </button>
              )}
            </motion.div>
          </>
        )}

      </div>

      <BottomNav active="qr" />
    </motion.div>
  );
}

function QRSkeleton() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
      <div className="skeleton" style={{ width: '200px', height: '24px', borderRadius: '8px' }} />
      <div className="skeleton" style={{ width: '260px', height: '260px', borderRadius: '12px' }} />
      <div className="skeleton" style={{ width: '200px', height: '44px', borderRadius: '10px' }} />
    </div>
  );
}
