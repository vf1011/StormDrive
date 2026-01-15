import React from 'react';
import './PageTransition.css';

const PageTransition = ({ show, direction, onAnimationEnd }) => {
  return show ? (
    <div 
      className={`page-transition ${direction}`}
      onAnimationEnd={onAnimationEnd}
    >
      <div className="transition-overlay" />
    </div>
  ) : null;
};

export default PageTransition;
