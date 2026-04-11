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
      <div className="auth-card">
        <h2 style={{ marginTop: '0' }}>Landmark</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px' }}>
          Sign in to track your adventures.
        </p>

        {message && <p style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{message}</p>}

        <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            className="form-input"
            type="text" 
            placeholder="Username" 
            aria-label="Username"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)} 
          />
          <input 
            className="form-input"
            type="password" 
            placeholder="Password" 
            aria-label="Password"
            value={loginPassword}
            onChange={(e) => setPassword(e.target.value)} 
          />

          <div style={{ textAlign: 'right', marginTop: '-5px', fontSize: '14px' }}>
            <Link
              to="/forgot-password"
              style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>

          <button className="btn btn-blue" type="submit">
            Login
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Don't have an account? <Link to="/signup" className="auth-link">Sign up</Link>
        </div>
      </div>
    </main>
  );
};

export default Login;