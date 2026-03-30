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
        backgroundColor: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ marginTop: '0', color: '#111827' }}>Landmark</h2>
        <p style={{ color: '#6b7280', marginBottom: '25px', fontSize: '14px' }}>
          Landmark
        </p>

        {message && <p style={{ color: '#ef4444', fontSize: '14px' }}>{message}</p>}

        <form onSubmit={doLogin}>
          <input 
            style={styles.input}
            type="text" 
            placeholder="Username" 
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)} 
          />
          <input 
            style={styles.input}
            type="password" 
            placeholder="Password" 
            value={loginPassword}
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button style={styles.button} type="submit">
            Login
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
          Don't have an account? <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;