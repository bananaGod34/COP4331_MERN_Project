import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import authBg from '../assets/auth-bg.jpg';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const doReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!token) {
      return setMessage('Invalid or missing reset token.');
    }

    if (newPassword !== confirmPassword) {
      return setMessage('Passwords do not match.');
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await response.json();

      if (!response.ok || res.error) {
        setMessage(res.error || 'Failed to reset password. The link may have expired.');
      } else {
        setMessage('Password updated successfully!');
        setIsSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (error) {
      setMessage('Could not connect to the server.');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-bg-wrapper">
        <img src={authBg} alt="Travel Background" />
        <div className="auth-bg-overlay" />
      </div>
      
      <div className="auth-hero-spacer" />

      <div className="auth-form-side">
        <div className="auth-card">
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="-4 -2 36 46">
              <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z" fill="var(--accent-blue)" fillRule="evenodd" />
            </svg>
            <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Landmark</h2>
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Create New Password</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
            Please enter your new password below.
          </p>

          {message && (
             <div style={{ background: isSuccess ? 'var(--info-bg)' : 'var(--accent-red-dim, #fee2e2)', color: isSuccess ? 'var(--info-text)' : '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>
              {message}
            </div>
          )}

          {!isSuccess ? (
            <form onSubmit={doReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>New Password</label>
                <input 
                  className="form-input" type="password" placeholder="••••••••" required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Confirm Password</label>
                <input 
                  className="form-input" type="password" placeholder="••••••••" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
              <button className="btn btn-blue" type="submit" style={{ marginTop: '10px', padding: '14px', fontSize: '16px' }}>
                Save Password
              </button>
            </form>
          ) : (
            <div style={{ marginTop: '10px' }}>
               <Link to="/login" className="btn btn-blue" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '14px', fontSize: '16px' }}>
                Return to Login
              </Link>
            </div>
          )}

        </div>
      </div>
    </main>
  );
};

export default ResetPassword;