import React from 'react';

const ModulePlaceholder = ({ title, headline, features, icon }) => {
  return (
    <div className="module-placeholder-wrapper">
      <div className="module-placeholder-background">
        {/* Background elements to blur */}
        <div className="bg-blob blob-1"></div>
        <div className="bg-blob blob-2"></div>
      </div>
      
      <div className="billboard-card">
        <div className="billboard-badge">
          <span className="badge-pill">🚀 IN DEVELOPMENT</span>
        </div>
        
        <div className="billboard-icon">{icon || '✨'}</div>
        
        <h2 className="billboard-title">{title}</h2>
        <h1 className="billboard-headline">{headline}</h1>
        
        <div className="billboard-features">
          {features.map((feature, index) => (
            <div key={index} className="feature-item">
              <span className="feature-check">✅</span>
              <span className="feature-text">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="billboard-footer">
          <p>We're building the future of SaaS. Stay tuned for early access.</p>
        </div>
      </div>
    </div>
  );
};

export default ModulePlaceholder;
