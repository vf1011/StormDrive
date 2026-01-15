import React from 'react';
import './FeatureCard.css';

const FeatureCard = ({ image, title, description }) => {
  return (
    <div className="feature-card">
      <img src={image} alt={title} className="feature-image" />

      {/* Content always visible on the image */}
      <div className="feature-static-content">
        <h3 className="feature-title">{title}</h3>
      </div>

      {/* Description appears on hover */}
      <div className="feature-description-section">
        <p>{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
