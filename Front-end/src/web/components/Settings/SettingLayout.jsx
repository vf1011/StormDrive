import { useState } from "react";
import { User, Lock, HardDrive, Share2, Smartphone, AlertTriangle } from "lucide-react";
import DashboardNav from "../Dashboard/DashboardNav";
import ProfileSection from "./ProfileSection";
import SecuritySection from "./Security";
import StorageCard from "./StoragePlan";
// import FileSharingPreferences from "./FileSharing";
import ConnectedDevices from "./ConnectedDevices";
import DangerZone from "./DangerZone";
import "./Styles/SettingLayout.css";

const SettingsPage = () => {
  const [activeSection, setActiveSection] = useState('profile');

  const settingsSections = [
    {
      id: 'profile',
      icon: <User size={20} />,
      title: 'Profile',
      description: 'Update your name, email, and profile picture.'
    },
    {
      id: 'security',
      icon: <Lock size={20} />,
      title: 'Security',
      description: 'Manage your password, 2FA, and device sessions.'
    },
    {
      id: 'storage',
      icon: <HardDrive size={20} />,
      title: 'Storage & Plan',
      description: 'View your usage, plan details, and billing info.'
    },
    // {
    //   id: 'sharing',
    //   icon: <Share2 size={20} />,
    //   title: 'File Sharing Preferences',
    //   description: 'Customize how your files are shared by default.'
    // },
    {
      id: 'devices',
      icon: <Smartphone size={20} />,
      title: 'Connected Devices / Apps',
      description: 'View and manage devices or apps with account access.'
    },
    {
      id: 'danger',
      icon: <AlertTriangle size={20} />,
      title: 'Danger Zone',
      description: 'Delete or reset your account. Be careful — these actions are irreversible.'
    }
  ];

  const renderSectionContent = (section) => {
    switch (section.id) {
      case 'profile':
        return <ProfileSection />;
      case 'security':
        return <SecuritySection />;
      case 'storage':
        return <StorageCard />;
      // case 'sharing':
      //   return <FileSharingPreferences />;
      case 'devices':
        return <ConnectedDevices />;
      case 'danger':
        return <DangerZone />;
      default:
        return (
          <div className="settings-card">
            <div className="card-content">
              <h2 className="section-title">{section.title}</h2>
              <p className="section-description">{section.description}</p>
              {section.id === 'danger' && (
                <button className="danger-button">
                  Delete My Account
                </button>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="dashboard">
      <div className="settings-sidebar">
        <div className="sidebar-header">
          <h2>Settings</h2>
        </div>
        <nav className="settings-nav">
          {settingsSections.map((section) => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <div className="nav-item-icon">{section.icon}</div>
              <span>{section.title}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="setting-dashboard-main">
        <DashboardNav />
        <div className="settings-content">
          <div className="settings-scroll">
          {settingsSections.map((section) => (
            <div 
              key={section.id} 
              className={`section-content ${activeSection === section.id ? 'active' : ''}`}
            >
              {renderSectionContent(section)}
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
