// NotificationBell.jsx
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import './Styles/Notificationbell.css';
import Notification from '../Transitions/Notification';
import { useFileContext } from '../Hooks/FileContext';

const NotificationBell = () => {
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, message: "📁 File uploaded: notes.pdf" },
    { id: 2, message: "🗑️ File deleted: draft.docx" },
  ]);

  const { notification, setNotification } = useFileContext();

  const handleCopy = (message) => {
    navigator.clipboard.writeText(message);
    setNotification({
      open: true,
      message: "📋 Copied notification text!",
      severity: "success",
    });
  };

  return (
    <div className="notification-wrapper">
      <button className="icon-button" onClick={() => setShowPanel(!showPanel)}>
        <Bell size={20} />
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length}</span>
        )}
      </button>

      {showPanel && (
        <div className="notification-panel">
          <div className="notification-header">🔔 Notifications</div>
          {notifications.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            <ul className="notification-list">
              {notifications.map((note) => (
                <li key={note.id} className="notification-item">
                  <span>{note.message}</span>
                  <button className="copy-btn" onClick={() => handleCopy(note.message)}>Copy</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Notification
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default NotificationBell;
