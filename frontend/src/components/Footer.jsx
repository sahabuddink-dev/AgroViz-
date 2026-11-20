import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p className="footer-meta">
          &copy; {new Date().getFullYear()} AgroViz &bull; Precision Agriculture Platform
        </p>
      </div>
    </footer>
  );
}
