import React, { useRef, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import authBg from '../assets/auth-bg.jpg';
import ThemeToggle from './ThemeToggle';

const AuthLayout = () => {
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    if (!contentRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setHeight(entries[0].target.scrollHeight);
    });
    
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [location.pathname]);

  return (
    <main className="auth-page">
      <ThemeToggle />
      
      <div className="auth-bg-wrapper">
        <img src={authBg} alt="Travel Background" />
        <div className="auth-bg-overlay" />
      </div>
      
      <div className="auth-hero-spacer" />

      <div className="auth-form-side">
        <div 
          style={{ 
            height: height !== 'auto' ? `${height}px` : 'auto',
            transition: 'height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), var(--theme-trans)',
            overflow: 'hidden' 
          }}
        >
          <div ref={contentRef} className="auth-content-animator" key={location.pathname}>
            <Outlet /> 
          </div>
        </div>
      </div>
    </main>
  );
};

export default AuthLayout;