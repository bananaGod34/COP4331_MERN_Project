import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      return setErrorMsg("Passwords do not match.");
    }

    //--------------TEMPORARY LOGIN--------------
    if (username && password) {
      console.log("Signup successful! User created.");
      navigate('/login'); 
    }
    
  };

  const styles = {
    page: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#f3f4f6',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    card: {
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '350px',
        textAlign: 'center'
    },
    input: {
        width: '100%',
        padding: '12px',
        margin: '10px 0',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        boxSizing: 'border-box',
        fontSize: '16px'
    },
    button: {
        width: '100%',
        padding: '12px',
        marginTop: '15px',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer'
    },
    linkText: {
        marginTop: '20px',
        fontSize: '14px',
        color: '#6b7280'
    },
    link: {
        color: '#3b82f6',
        textDecoration: 'none',
        fontWeight: '500'
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ marginTop: '0', color: '#111827' }}>Create Account</h2>
        <p style={{ color: '#6b7280', marginBottom: '25px', fontSize: '14px' }}>
            Create Account
        </p>

        {errorMsg && <p style={{ color: '#ef4444', fontSize: '14px' }}>{errorMsg}</p>}

        <form onSubmit={handleSignup}>
          <input style={styles.input} type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <input style={styles.input} type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button style={styles.button} type="submit">Sign Up</button>
        </form>

        <div style={styles.linkText}>
          Already have an account? <Link to="/login" style={styles.link}>Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;