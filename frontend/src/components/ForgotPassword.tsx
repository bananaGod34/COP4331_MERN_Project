import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const doSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await response.json();

      if (!response.ok || res.error) {
        setMessage(res.error || 'Failed to process request.');
        setIsSuccess(false);
      } else {
        setMessage(res.message || 'If an account exists, a reset link has been sent.');
        setIsSuccess(true);
      }
    } catch (error) {
      setMessage('Could not connect to the server.');
      setIsSuccess(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 style={{ marginTop: '0' }}>Reset Password</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {message && (
          <p style={{ color: isSuccess ? 'var(--accent-blue)' : 'var(--accent-red)', fontSize: '14px' }}>
            {message}
          </p>
        )}

        {!isSuccess && (
          <form onSubmit={doSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              className="form-input"
              type="email" 
              placeholder="Email Address" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
            />
            <button className="btn btn-blue" type="submit">
              Send Reset Link
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Remember your password? <Link to="/login" className="auth-link">Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;