import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authBg from '../assets/auth-bg.jpg';
import ThemeToggle from './ThemeToggle';

// MINI ICON SUITE
const Icons = {
  Loader: () => <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>,
  EyeOff: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
};

const Signup = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  
  // NEW STATES
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();

  // STRENGTH CALCULATOR
  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score; // Returns 0, 1, 2, 3, or 4
  };

  const strengthScore = calculateStrength(loginPassword);
  const strengthColors = ['var(--border-light)', 'var(--accent-red)', '#f59e0b', 'var(--accent-blue)', 'var(--accent-green)'];
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong!'];

  const doSignup = async (event: any): Promise<void> => {
    event.preventDefault();
    setMessage('');

    if(loginPassword !== confirmPassword) {
      return setMessage('Passwords do not match');
    }

    setIsLoading(true); // START LOADER

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, email, login: loginName, password: loginPassword }),
        headers: { 'Content-Type': 'application/json' }
      });

      const res = await response.json();

      if (res.error) {
        setMessage(res.error);
      } else {
        navigate('/verify', { state: { email: email } }); 
      }
    } catch (error: any) {
      setMessage('Could not connect to the server.');
    } finally {
      setIsLoading(false); // STOP LOADER
    }
  };

  return (
    <main className="auth-page">
      <ThemeToggle />
      <div className="auth-bg-wrapper">
        <img src={authBg} alt="Travel Background" />
        <div className="auth-bg-overlay" />
      </div>
      
      <div className="auth-hero-spacer" />

      <div className="auth-form-side">
        <div className="auth-card">
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="-4 -2 36 46">
              <path d="M14 0 C6.27 0 0 6.27 0 14 C0 24.5 14 38 14 38 C14 38 28 24.5 28 14 C28 6.27 21.73 0 14 0 Z M 14 9 A 5 5 0 1 0 14 19 A 5 5 0 1 0 14 9 Z" fill="var(--accent-green)" fillRule="evenodd" />
            </svg>
            <h2 style={{ margin: 0, fontSize: '28px', letterSpacing: '-0.5px' }}>Landmark</h2>
          </div>

          <h3 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Start your journey</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '15px' }}>
            Create an account to start mapping.
          </p>

          {message && <div style={{ background: 'var(--accent-red-dim, #fee2e2)', color: '#dc2626', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>{message}</div>}

          <form onSubmit={doSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>First Name</label>
                <input autoFocus className="form-input" type="text" placeholder="Jane" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
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
                <div style={{ position: 'relative' }}>
                  <input 
                    className="form-input" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" required 
                    value={loginPassword} 
                    onChange={(e) => setPassword(e.target.value)} 
                    style={{ paddingRight: '40px' }}
                  />
                  <button 
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                  >
                    {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
                
                <div style={{ 
                  marginTop: loginPassword.length > 0 ? '8px' : '0',
                  maxHeight: loginPassword.length > 0 ? '30px' : '0', 
                  opacity: loginPassword.length > 0 ? 1 : 0,
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
                }}>
                  <div style={{ display: 'flex', gap: '4px', height: '4px' }}>
                    {[1, 2, 3, 4].map(level => (
                      <div 
                        key={level} 
                        style={{ 
                          flex: 1, borderRadius: '2px', 
                          background: strengthScore >= level ? strengthColors[strengthScore] : 'var(--border-light)',
                          transition: 'background 0.3s ease'
                        }} 
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: strengthColors[strengthScore], marginTop: '4px', fontWeight: 'bold', textAlign: 'right' }}>
                    {strengthLabels[strengthScore]}
                  </div>
                </div>

              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-main)' }}>Confirm</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    className="form-input" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    style={{ paddingRight: '40px' }}
                  />
                </div>
              </div>
            </div>

            <button 
              className="btn btn-green" 
              type="submit" 
              disabled={isLoading}
              style={{ marginTop: '10px', padding: '14px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading && <Icons.Loader />}
              <span>{isLoading ? "Creating Account..." : "Create Account"}</span>
            </button>
          </form>

          <div style={{ marginTop: '30px', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Already an explorer? <Link to="/login" className="auth-link">Log in</Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Signup;