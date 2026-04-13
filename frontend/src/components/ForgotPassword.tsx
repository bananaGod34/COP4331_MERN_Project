import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Icons = {
  Loader: () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
};

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const doSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
          
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="-4 -2 36 46">
            <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z" fill="var(--accent-blue)" fillRule="evenodd" />
        </svg>
        <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Landmark</h2>
        </div>

        <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Reset Password</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
        Enter your email address and we'll send you a link to reset your password.
        </p>

        {message && (
            <div style={{ background: isSuccess ? 'var(--info-bg)' : 'var(--accent-red-dim, #fee2e2)', color: isSuccess ? 'var(--info-text)' : '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>
            {message}
        </div>
        )}

        {!isSuccess && (
        <form onSubmit={doSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Email Address</label>
            <input 
                autoFocus
                className="form-input" type="email" placeholder="jane@example.com" required
                value={email} onChange={(e) => setEmail(e.target.value)} 
            />
            </div>
            <button 
            className="btn btn-blue" 
            type="submit" 
            disabled={isLoading}
            style={{ marginTop: '10px', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1 }}
            >
            {isLoading && <Icons.Loader />}
            <span>{isLoading ? "Sending..." : "Send Reset Link"}</span>
            </button>
        </form>
        )}

        <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Remember your password? <Link to="/login" className="auth-link">Back to Login</Link>
        </div>
    </div>
  );
};

export default ForgotPassword;