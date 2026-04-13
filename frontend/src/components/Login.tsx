import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// MINI ICON SUITE
const Icons = {
  Loader: () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  EyeOff: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
};

const Login = () => {
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const [message, setMessage] = useState('');
  
  // NEW STATES
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  const doLogin = async (event: any): Promise<void> => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ login: loginName, password: loginPassword }),
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await response.json();

      if (res.id <= 0) {
        setMessage('User/Password combination incorrect');
      } else {
        const user = { firstName: res.firstName, lastName: res.lastName, id: res.id };
        localStorage.setItem('user_data', JSON.stringify(user));
        navigate('/map'); 
      }
    } catch (error: any) {
      setMessage('Could not connect to the server.');
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

      <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Welcome back</h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
        Where will your journey take you next?
      </p>

      <div style={{ 
        maxHeight: message ? '24px' : '0', 
        opacity: message ? 1 : 0, 
        overflow: 'hidden',
        marginBottom: message ? '15px' : '0',
        transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
      }}>
        <div style={{ color: 'var(--accent-red)', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          {message}
        </div>
      </div>

      <form onSubmit={doLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Username</label>
          <input 
            className="form-input" type="text" placeholder="Enter your username" 
            value={loginName} onChange={(e) => setLoginName(e.target.value)} 
            autoFocus
          />
        </div>
        
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-main)' }}>Password</label>
            <Link to="/forgot-password" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>Forgot password?</Link>
          </div>

          <div style={{ position: 'relative' }}>
            <input 
              className="form-input" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={loginPassword} 
              onChange={(e) => setPassword(e.target.value)} 
              style={{ paddingRight: '40px' }}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
            </button>
          </div>
        </div>

        <button 
          className="btn btn-blue" 
          type="submit" 
          disabled={isLoading}
          style={{ marginTop: '10px', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1 }}
        >
          {isLoading && <Icons.Loader />}
          <span>{isLoading ? "Signing In..." : "Sign In"}</span>
        </button>
      </form>

      <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
        Don't have an account? <Link to="/signup" className="auth-link" style={{ color: 'var(--accent-green)' }}>Sign up</Link>
      </div>
    </div>
  );
};

export default Login;