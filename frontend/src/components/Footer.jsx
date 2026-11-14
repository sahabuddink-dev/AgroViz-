import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <p className="footer-disclaimer">
          ⚠️ <strong>Research prototype:</strong> Satellite vegetation indices, gridded model estimates, and literature-based parameters
          are indirect environmental indicators, <em>not confirmation of pest infestation</em> or field-validated risk scores.
        </p>
        <p className="footer-meta">
          MCA Research Prototype (SIH25099) • Akola, Maharashtra • React + FastAPI + Open Data
        </p>
      </div>
    </footer>
  );
}
