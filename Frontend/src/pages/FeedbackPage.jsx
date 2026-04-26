import React, { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import Navbar from '../components/Navbar';
import BottomNav from '../components/BottomNav';
import { baseUrl } from '../baseurl';

/**
 * FEEDBACK PAGE
 *
 * Simple 5-star rating + comments form.
 * Sends to POST /api/submit/feedback with rollno from JWT.
 *
 * Interview tip:
 * We extract rollno from the JWT instead of storing it separately in cookies.
 * JWT already contains user identity — no need to duplicate it elsewhere.
 */

export default function FeedbackPage({ token }) {
  const [rating, setRating]       = useState(0);
  const [hovered, setHovered]     = useState(0);
  const [name, setName]           = useState('');
  const [comments, setComments]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !name.trim() || !comments.trim()) return;

    try {
      setLoading(true);
      setError(null);

      // Get rollno from JWT instead of separate cookie
      const { rollno } = jwtDecode(token);

      await axios.post(`${baseUrl}/api/submit/feedback`, {
        rating,
        name: name.trim(),
        comments: comments.trim(),
        rollno,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSubmitted(true);
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bottom-nav-space">
      <Navbar token={token} />

      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '24px 16px' }}>

        {submitted ? (
          // ─── Success state ───
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            style={{ padding: '48px 24px', textAlign: 'center' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text)', marginBottom: '8px' }}>
              Thanks for the feedback!
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
              Your response helps make Spectra better for everyone.
            </div>
          </motion.div>
        ) : (
          // ─── Form ───
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card"
            style={{ padding: '24px' }}
          >
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--text)', marginBottom: '4px' }}>
                Your feedback
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
                Help us improve Spectra ✦
              </div>
            </div>

            <form onSubmit={handleSubmit}>

              {/* ─── Star Rating ─── */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '12px' }}>
                  How's your experience?
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const filled = star <= (hovered || rating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '2rem',
                          transition: 'transform 150ms',
                          transform: filled ? 'scale(1.1)' : 'scale(1)',
                          filter: filled ? 'none' : 'grayscale(1) opacity(0.4)',
                        }}
                      >
                        ⭐
                      </button>
                    );
                  })}
                </div>
                {rating > 0 && (
                  <div style={{ color: 'var(--primary)', fontSize: '0.8125rem', marginTop: '6px' }}>
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Amazing!'][rating]}
                  </div>
                )}
              </div>

              {/* ─── Name ─── */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '8px' }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    padding: '12px 14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 200ms',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {/* ─── Comments ─── */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '8px' }}>
                  Comments
                </label>
                <textarea
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="What can we improve? What do you love?"
                  required
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    padding: '12px 14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    transition: 'border-color 200ms',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '16px' }}>
                  {error}
                </div>
              )}

              {/* ─── Submit ─── */}
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !rating || !name.trim() || !comments.trim()}
                style={{ width: '100%', opacity: loading || !rating || !name.trim() || !comments.trim() ? 0.5 : 1 }}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </button>

            </form>
          </motion.div>
        )}

      </div>

      <BottomNav active="feedback" />
    </motion.div>
  );
}
