import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { X, CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import ModalPortal from '../Dashboard/Modalportal';
import './Notification.css';

const Notification = ({ 
  open, 
  message, 
  severity = 'info', 
  onClose, 
  title,
  duration = 5000, // Changed from 50000 to 5000 for better UX
  action 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
      setIsExiting(false);
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [open, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Match CSS animation duration
  }; // FIXED: Added missing closing brace and semicolon

  const getIcon = () => {
    switch (severity) {
      case 'success':
        return <CheckCircle size={24} className="notification-icon" />;
      case 'warning':
        return <AlertTriangle size={24} className="notification-icon" />;
      case 'error':
        return <XCircle size={24} className="notification-icon" />;
      default:
        return <Info size={24} className="notification-icon" />;
    }
  };

  const getTitle = () => {
    if (title) return title;
    
    switch (severity) {
      case 'success':
        return 'Success!';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Information';
    }
  };

  if (!open || !isVisible) return null;

  return (
    <ModalPortal>
   <div className="notification-container">
    <div className={`notification notification-${severity} ${isExiting ? 'notification-exit' : 'notification-enter'}`}>

      <div className="notification-content">
        <div className="notification-icon-wrapper">
          {getIcon()}
        </div>
        <div className="notification-text">
          <div className="notification-title">{getTitle()}</div>
          <div className="notification-message">{message}</div>
          {action && (
            <button className="notification-action" onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </div>
      </div>
      <button className="notification-close" onClick={handleClose}>
        <X size={18} />
      </button>
    </div>
    </div>
    </ModalPortal>
  );
};

Notification.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  severity: PropTypes.oneOf(['success', 'error', 'info', 'warning']).isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  duration: PropTypes.number,
  action: PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired
  })
};

export default Notification;