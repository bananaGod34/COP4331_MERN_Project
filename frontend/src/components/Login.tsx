import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const doLogin = async (event: any): Promise<void> => {
    event.preventDefault();
    setMessage('');

    const obj = { login: loginName, password: loginPassword };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' }
      });

      const res = JSON.parse(await response.text());

      if (res.id <= 0) {
        setMessage('User/Password combination incorrect');
      } else {
        const user = { firstName: res.firstName, lastName: res.lastName, id: res.id };
        localStorage.setItem('user_data', JSON.stringify(user));
        setMessage('');
        navigate('/map'); 
      }
    } catch (error: any) {
      setMessage('Could not connect to the server.');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-hero" />

      <div className="auth-form-side">
        <div className="auth-card">

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="-4 -2 36 46">
              <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z" fill="var(--accent-blue)" fillRule="evenodd" />
            </svg>
            <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Landmark</h2>
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Welcome back</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
            Sign in to track your adventures.
          </p>

          {message && <div style={{ background: 'var(--accent-red-dim, #fee2e2)', color: '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>{message}</div>}

          <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Username</label>
              <input 
                className="form-input" type="text" placeholder="Username" 
                value={loginName} onChange={(e) => setLoginName(e.target.value)} 
              />
            </div>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>Forgot password?</Link>
              </div>
              <input 
                className="form-input" type="password" placeholder="Password" 
                value={loginPassword} onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <button className="btn btn-blue" type="submit" style={{ marginTop: '10px', padding: '14px', fontSize: '16px' }}>
              Sign In
            </button>
          </form>

          <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;