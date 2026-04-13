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
      //>>>CHECK THE ENDPOINT
      const response = await fetch('/api/signup', {
        method: 'POST',
        body: js,
        headers: { 'Content-Type': 'application/json' }
      });

      //>>>ASSUMING THE API RETURNS A SUCCESS STATUS
      const res = JSON.parse(await response.text());

      if (res.error) {
        setMessage(res.error);
      } else {
        const user = { firstName: firstName, lastName: lastName, id: res.id };
        localStorage.setItem('user_data', JSON.stringify(user));
        navigate('/verify'); 
      }
    } catch (error: any) {
      setMessage('Could not connect to the server.');
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h2 style={{ marginTop: '0' }}>Create Account</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '25px', fontSize: '14px' }}>
          Create an account to start mapping.
        </p>

        {message && <p style={{ color: 'var(--accent-red)', fontSize: '14px' }}>{message}</p>}

        <form onSubmit={doSignup} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              className="form-input" type="text" placeholder="First Name" required
              aria-label="First Name"
              value={firstName} onChange={(e) => setFirstName(e.target.value)} 
            />
            <input 
              className="form-input" type="text" placeholder="Last Name" required
              aria-label="Last Name"
              value={lastName} onChange={(e) => setLastName(e.target.value)} 
            />
          </div>
          <input 
            className="form-input" type="email" placeholder="Email Address" required
            aria-label="Email Address"
            value={email} onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            className="form-input" type="text" placeholder="Username" required
            aria-label="Username"
            value={loginName} onChange={(e) => setLoginName(e.target.value)} 
          />
          <input 
            className="form-input" type="password" placeholder="Password" required
            aria-label="Password"
            value={loginPassword} onChange={(e) => setPassword(e.target.value)} 
          />
          <input 
            className="form-input" type="password" placeholder="Confirm Password" required
            aria-label="Confirm Password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} 
          />
          <button className="btn btn-green" type="submit">
            Create Account
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Already have an account? <Link to="/login" className="auth-link">Log in</Link>
        </div>
      </div>
    </main>
  );
};

export default Signup;