import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  const doSignup = async (event: any): Promise<void> => {
    event.preventDefault();
    setMessage('');

    if(loginPassword !== confirmPassword) {
      return setMessage('Passwords do not match');
    }

    const obj = { firstName, lastName, email, login: loginName, password: loginPassword };
    const js = JSON.stringify(obj);

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' }
      });

      const res = JSON.parse(await response.text());

      if (res.error) {
        setMessage(res.error);
      } else {
        const user = { firstName: firstName, lastName: lastName, id: res.id };
        localStorage.setItem('user_data', JSON.stringify(user));
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
              <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z" fill="var(--accent-green)" fillRule="evenodd" />
            </svg>
            <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Landmark</h2>
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Create Account</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
            Create an account to start mapping.
          </p>

          {message && <div style={{ background: 'var(--accent-red-dim, #fee2e2)', color: '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>{message}</div>}

          <form onSubmit={doSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>First Name</label>
                <input className="form-input" type="text" placeholder="Jane" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Last Name</label>
                <input className="form-input" type="text" placeholder="Doe" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Email</label>
              <input className="form-input" type="email" placeholder="jane@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Username</label>
              <input className="form-input" type="text" placeholder="Choose a username" required value={loginName} onChange={(e) => setLoginName(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Password</label>
                <input className="form-input" type="password" placeholder="••••••••" required value={loginPassword} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Confirm</label>
                <input className="form-input" type="password" placeholder="••••••••" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-green" type="submit" style={{ marginTop: '10px', padding: '14px', fontSize: '16px' }}>
              Create Account
            </button>
          </form>

          <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Already have an account? <Link to="/login" className="auth-link" style={{ color: 'var(--accent-green)' }}>Log in</Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Signup;