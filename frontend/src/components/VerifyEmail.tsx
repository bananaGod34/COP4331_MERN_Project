import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const hasFetched = useRef(false); // Prevents React StrictMode from firing twice

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the URL.');
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
  }, [token]);

  return (
    <main className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginTop: '0' }}>Email Verification</h2>
        
        <p style={{ 
          color: status === 'error' ? 'var(--accent-red)' : (status === 'success' ? 'var(--accent-blue)' : 'var(--text-muted)'), 
          marginBottom: '25px', 
          fontSize: '16px',
          fontWeight: 'bold'
        }}>
          {message}
        </p>

        {status !== 'loading' && (
          <Link to="/login" className="btn btn-blue" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', boxSizing: 'border-box' }}>
            Go to Login
          </Link>
        )}
      </div>
    </main>
  );
};

export default VerifyEmail;