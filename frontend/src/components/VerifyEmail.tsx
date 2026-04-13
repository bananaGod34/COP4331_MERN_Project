import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
import authBg from '../assets/auth-bg.jpg';
import ThemeToggle from './ThemeToggle';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Safely grab the email we passed from the signup page!
  const userEmail = location.state?.email;

  const [status, setStatus] = useState<'pending' | 'loading' | 'success' | 'error'>(token ? 'loading' : 'pending');
  const [message, setMessage] = useState(token ? 'Verifying your email...' : '');
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token) {
      if (!userEmail) {
        setStatus('error');
        setMessage('No verification token found in the URL.');
      }
      return;
    }

    const verifyToken = async () => {
      if (hasFetched.current) return;
      hasFetched.current = true;

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token }),
          headers: { 'Content-Type': 'application/json' }
        });

        const res = await response.json();

        if (!response.ok || res.error) {
          setStatus('error');
          setMessage(res.error || 'Verification failed. The link may have expired.');
        } else {
          setStatus('success');
          setMessage(res.message || 'Email verified successfully!');
          setTimeout(() => navigate('/login'), 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('Could not connect to the server.');
      }
    };

    verifyToken();
  }, [token, userEmail, navigate]);

  return (
    <main className="auth-page">
        <ThemeToggle />
      <div className="auth-bg-wrapper">
        <img src={authBg} alt="Travel Background" />
        <div className="auth-bg-overlay" />
      </div>
      
      <div className="auth-hero-spacer" />

      <div className="auth-form-side">
        <div className="auth-card" style={{ textAlign: 'center' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="-4 -2 36 46">
              <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z" fill="var(--accent-blue)" fillRule="evenodd" />
            </svg>
            <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Landmark</h2>
          </div>

          {status === 'pending' ? (
            <>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Check your inbox</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
                We've sent a verification link to <strong>{userEmail}</strong>. Please click the link to verify your account.
              </p>
              <Link to="/login" className="btn btn-blue" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', boxSizing: 'border-box', padding: '14px', fontSize: '16px' }}>
                Return to Login
              </Link>
            </>
          ) : (
            <>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Email Verification</h3>
              <p style={{ 
                color: status === 'error' ? 'var(--accent-red)' : (status === 'success' ? 'var(--accent-blue)' : 'var(--text-muted)'), 
                marginBottom: '25px', 
                fontSize: '16px',
                fontWeight: 'bold'
              }}>
                {message}
              </p>
              {status !== 'loading' && (
                <Link to="/login" className="btn btn-blue" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', boxSizing: 'border-box', padding: '14px', fontSize: '16px' }}>
                  Go to Login
                </Link>
              )}
            </>
          )}

        </div>
      </div>
    </main>
  );
};

export default VerifyEmail;