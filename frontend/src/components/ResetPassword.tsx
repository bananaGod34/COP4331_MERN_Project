import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';

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
        setTimeout(() => navigate('/login'), 3000); // Auto-redirect after 3 seconds
      }
    } catch (error) {
      setMessage('Could not connect to the server.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 style={{ marginTop: '0' }}>Create New Password</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px' }}>
          Please enter your new password below.
        </p>

        {message && (
          <p style={{ color: isSuccess ? 'var(--accent-blue)' : 'var(--accent-red)', fontSize: '14px' }}>
            {message}
          </p>
        )}

        {!isSuccess ? (
          <form onSubmit={doReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              className="form-input"
              type="password" 
              placeholder="New Password" 
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} 
            />
            <input 
              className="form-input"
              type="password" 
              placeholder="Confirm New Password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} 
            />
            <button className="btn btn-blue" type="submit">
              Reset Password
            </button>
          </form>
        ) : (
          <div style={{ marginTop: '10px' }}>
             <Link to="/login" className="btn btn-blue" style={{ display: 'inline-block', textDecoration: 'none', width: '100%', boxSizing: 'border-box', textAlign: 'center' }}>
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;