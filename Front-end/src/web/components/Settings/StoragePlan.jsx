import { useEffect, useState } from "react";
import "./Styles/StoragePlan.css";
import { supabase } from "../../../supabase";
import ModalPortal from "../Dashboard/Modalportal";

const StoragePlansSection = () => {
  const [usage, setUsage] = useState(null);
  const [planDetails, setPlanDetails] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const [useMockData, setUseMockData] = useState(false); // Toggle for development

  useEffect(() => {
    fetchStorageData();
  }, []);

  // // Development toggle
  // const toggleMockData = () => {
  //   setUseMockData(!useMockData);
  //   if (!useMockData) {
  //     setMockData();
  //     setLoading(false);
  //   } else {
  //     fetchStorageData();
  //   }
  // };

  const fetchStorageData = async () => {
    setLoading(true);
    setError(null);
    
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      // If no token, use mock data for development
      if (!token) {
        console.warn("No auth token found, using mock data");
        setMockData();
        return;
      }

      // Fetch storage stats and breakdown (matching your existing API structure)
      const statsRes = await fetch('http://127.0.0.1:5000/storage/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const breakdownRes = await fetch('http://127.0.0.1:5000/storage/breakdown', {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Fetch plan info (new endpoint we'll need to create)
      const planRes = await fetch('http://127.0.0.1:5000/storage/plan-info', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsRes.ok && breakdownRes.ok) {
        const stats = await statsRes.json();
        const breakdown = await breakdownRes.json();
        
        console.log('🔍 Raw API Stats:', stats);
        console.log('🔍 Raw API Breakdown:', breakdown);

        // Calculate storage values (using your existing logic)
        const usedBytes = stats.total_used_storage || 0;
        const totalBytes = stats.total_storage || (15 * 1024 ** 3);
        
        // Set usage data
        setUsage({
          used: usedBytes,
          quota: totalBytes,
          documents: 0, // We'll calculate this from breakdown
          images: 0,
          others: 0
        });

        // Process breakdown data (using your existing logic)
        const breakdownData = breakdown.active_files_breakdown || {};
        console.log('📁 Raw breakdown data:', breakdownData);
        
        // Group by category
        const categoryGroups = {};
        
        Object.entries(breakdownData).forEach(([mimeType, info]) => {
          const category = getMimeTypeCategory(mimeType);
          
          if (!categoryGroups[category]) {
            categoryGroups[category] = {
              size_bytes: 0,
              fileCount: 0
            };
          }
          
          categoryGroups[category].size_bytes += (info.size_gb || 0) * (1024 ** 3);
          categoryGroups[category].fileCount += info.file_count || 0;
        });

        // Update usage with breakdown
        setUsage(prev => ({
          ...prev,
          documents: categoryGroups['Documents']?.size_bytes || 0,
          images: categoryGroups['Images']?.size_bytes || 0,
          others: (categoryGroups['Other Files']?.size_bytes || 0) + 
                 (categoryGroups['Videos']?.size_bytes || 0) + 
                 (categoryGroups['Audio']?.size_bytes || 0)
        }));

        // Handle plan info if available
        if (planRes.ok) {
          const planData = await planRes.json();
          setPlanDetails({
            plan_type: planData.plan_type || "fixed",
            plan_name: planData.plan_name || "Starter",
            storage_limit: totalBytes,
            price: planData.price || 149,
            currency: planData.currency || "₹",
            rate_per_gb: planData.rate_per_gb || null,
            educational_discount: planData.educational_discount || false,
            billing_cycle: planData.billing_cycle || "Monthly"
          });
          
          setBilling(planData.billing || null);
        } else {
          // Set default plan info
          setPlanDetails({
            plan_type: "fixed",
            plan_name: "Starter",
            storage_limit: totalBytes,
            price: 149,
            currency: "₹",
            rate_per_gb: null,
            educational_discount: false,
            billing_cycle: "Monthly"
          });
          
          setBilling({
            last_bill_amount: 149,
            last_bill_date: "2024-01-15",
            next_bill_date: "2024-02-15",
            billing_cycle: "Monthly",
            payment_method: "Visa Card ending in 4242",
            invoice_url: null
          });
        }

      } else {
        console.warn("API request failed, using mock data");
        setMockData();
      }
      
    } catch (err) {
      console.error("Error fetching storage data:", err.message);
      console.warn("Using mock data due to error");
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  // Helper function to categorize MIME types (same as your existing code)
  const getMimeTypeCategory = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || 
        mimeType.includes('text') || mimeType.includes('word') ||
        mimeType.includes('excel') || mimeType.includes('powerpoint')) {
      return 'Documents';
    }
    return 'Other Files';
  };

  const setMockData = () => {
    // Mock data for development/testing
    setUsage({
      used: 4500000000, // 4.2 GB
      quota: 15000000000, // 15 GB
      documents: 2000000000, // 1.9 GB
      images: 1500000000, // 1.4 GB
      others: 1000000000 // 930 MB
    });
    
    setPlanDetails({
      plan_type: "fixed",
      plan_name: "Starter",
      storage_limit: 15000000000, // 15 GB
      price: 149,
      currency: "₹",
      rate_per_gb: null,
      educational_discount: false,
      billing_cycle: "Monthly"
    });
    
    setBilling({
      last_bill_amount: 149,
      last_bill_date: "2024-01-15",
      next_bill_date: "2024-02-15",
      billing_cycle: "Monthly",
      payment_method: "Visa Card ending in 4242",
      invoice_url: "/mock-invoice.pdf"
    });
  };

  const handleUpgradePlan = () => {
    // Redirect to pricing page or open plan selection modal
    // open /pricing (or whatever route) in a new browser tab
    window.open('/pricing', '_blank', 'noopener,noreferrer');
  };

  const handleSwitchPlanType = () => {
    // Show modal for switching between fixed and flexible
    document.getElementById('switchPlanModal').classList.remove('hidden');
  };

  const handleDownloadInvoice = () => {
    if (billing?.invoice_url) {
      window.open(billing.invoice_url, '_blank');
    } else {
      alert('No invoice available for download');
    }
  };

  const closeSwitchModal = () => {
    document.getElementById('switchPlanModal').classList.add('hidden');
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (bytes >= 1024 && i < units.length - 1) {
      bytes /= 1024;
      i++;
    }
    return `${bytes.toFixed(1)} ${units[i]}`;
  };

  const getUsagePercentage = () => {
    if (!usage || !usage.quota) return 0;
    return Math.min((usage.used / usage.quota) * 100, 100);
  };

  const getUsageColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return "#ef4444"; // Red
    if (percentage >= 75) return "#f59e0b"; // Orange
    return "#10b981"; // Green
  };

  const formatCurrency = (amount, currency = "₹") => {
    if (!amount) return "₹0";
    return `${currency}${amount}`;
  };

  if (loading) {
    return (
      <div className="storage-page">
        <div className="storage-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading storage and billing information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="storage-page">
        <div className="storageplan-container">
          <div className="error-state">
            <p>Error loading storage information: {error}</p>
            <button className="btn-secondary" onClick={fetchStorageData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="storage-page">
      <div className="storageplan-container">
        {/* Header */}
        <div className="storage-header">
          <div className="header-content">
            <h1>Storage & Billing</h1>
            <p>Manage your storage usage, subscription plan, and billing information</p>
          </div>
          <div className="header-actions-storage">
            {/* <button className="btn-secondary" onClick={toggleMockData}>
              {useMockData ? "Use Real Data" : "Use Mock Data"}
            </button> */}
            <button className="btn-secondary" onClick={handleDownloadInvoice}>
              Download Invoice
            </button>
            <button className="btn-primary" onClick={handleUpgradePlan}>
              {planDetails?.plan_name === "Free" ? "Upgrade Plan" : "Change Plan"}
            </button>
          </div>
        </div>

        <div className="storage-grid">
          {/* Left Column */}
          <div className="storage-column">
            {/* Current Storage Usage */}
            <div className="storage-card">
              <h2>Current Storage Usage</h2>
              
              <div className="usage-section">
                <div className="usage-stats">
                  <div className="usage-summary">
                    <span className="usage-text">
                      <strong>{formatSize(usage?.used)}</strong> of <strong>{formatSize(usage?.quota)}</strong> used
                    </span>
                    <span className="usage-percentage">
                      {getUsagePercentage().toFixed(1)}% used
                    </span>
                  </div>
                </div>
                
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${getUsagePercentage()}%`,
                      backgroundColor: getUsageColor()
                    }}
                  ></div>
                </div>
                
                <div className="usage-breakdown">
                  <div className="breakdown-item">
                    <span className="breakdown-label">📄 Documents</span>
                    <span className="breakdown-value">{formatSize(usage?.documents)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">🖼️ Images</span>
                    <span className="breakdown-value">{formatSize(usage?.images)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="breakdown-label">📁 Other Files</span>
                    <span className="breakdown-value">{formatSize(usage?.others)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Plan Details */}
            <div className="storage-card">
              <h2>Current Plan Details</h2>
              
              <div className="plan-details-section">
                <div className="plan-type-header">
                  <div className="plan-type-info">
                    <h3>
                      {planDetails?.plan_type === "fixed" ? "Fixed Plan" : "Flexible (Pay-as-you-go)"}
                    </h3>
                    <span className="plan-type-badge">
                      {planDetails?.plan_type === "fixed" ? "Fixed" : "Flexible"}
                    </span>
                  </div>
                </div>

                {planDetails?.plan_type === "fixed" ? (
                  <div className="fixed-plan-details">
                    <div className="plan-info-item">
                      <span className="info-label">Plan Name</span>
                      <span className="info-value">{planDetails.plan_name}</span>
                    </div>
                    <div className="plan-info-item">
                      <span className="info-label">Storage Limit</span>
                      <span className="info-value">{formatSize(planDetails.storage_limit)}</span>
                    </div>
                    {planDetails.price && (
                      <div className="plan-info-item">
                        <span className="info-label">Price</span>
                        <span className="info-value price-highlight">
                          {formatCurrency(planDetails.price, planDetails.currency)}/{planDetails.billing_cycle?.toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flexible-plan-details">
                    <div className="plan-info-item">
                      <span className="info-label">Rate per GB</span>
                      <span className="info-value price-highlight">
                        {formatCurrency(planDetails.rate_per_gb, planDetails.currency)}/GB
                      </span>
                    </div>
                    <div className="plan-info-item">
                      <span className="info-label">Billing Cycle</span>
                      <span className="info-value">{planDetails.billing_cycle}</span>
                    </div>
                    <div className="plan-info-item">
                      <span className="info-label">Educational Discount</span>
                      <span className={`info-value ${planDetails.educational_discount ? 'discount-active' : 'discount-inactive'}`}>
                        {planDetails.educational_discount ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="plan-actions">
                  <button className="btn-secondary full-width" onClick={handleSwitchPlanType}>
                    Switch to {planDetails?.plan_type === "fixed" ? "Flexible" : "Fixed"} Plan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="storage-column">
            {/* Billing Summary */}
            <div className="storage-card">
              <h2>Billing Summary</h2>
              
              <div className="billing-summary">
                {billing?.last_bill_amount ? (
                  <>
                    <div className="billing-item">
                      <span className="billing-label">Last Bill Amount</span>
                      <span className="billing-value amount-highlight">
                        {formatCurrency(billing.last_bill_amount, planDetails?.currency)}
                      </span>
                    </div>
                    {billing.last_bill_date && (
                      <div className="billing-item">
                        <span className="billing-label">Last Bill Date</span>
                        <span className="billing-value">{billing.last_bill_date}</span>
                      </div>
                    )}
                    {billing.next_bill_date && (
                      <div className="billing-item">
                        <span className="billing-label">Next Bill Date</span>
                        <span className="billing-value">{billing.next_bill_date}</span>
                      </div>
                    )}
                    <div className="billing-item">
                      <span className="billing-label">Billing Cycle</span>
                      <span className="billing-value">{billing.billing_cycle}</span>
                    </div>
                    {billing.payment_method && (
                      <div className="billing-item">
                        <span className="billing-label">Payment Method</span>
                        <span className="billing-value">{billing.payment_method}</span>
                      </div>
                    )}
                    
                    {billing.invoice_url && (
                      <div className="invoice-actions">
                        <button className="btn-link" onClick={handleDownloadInvoice}>
                          📄 Download Latest Invoice
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-billing-info">
                    <p>No billing information available</p>
                    <p className="billing-note">
                      {planDetails?.plan_name === "Free" 
                        ? "You're currently on the free plan" 
                        : "Billing information will appear after your first payment"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Plan Management */}
            <div className="storage-card">
              <h2>Plan Management</h2>
              
              <div className="plan-management">
                <div className="management-option">
                  <div className="option-info">
                    <h4>Upgrade or Change Plan</h4>
                    <p>View all available plans and pricing options</p>
                  </div>
                  <button className="btn-primary" onClick={handleUpgradePlan}>
                    {planDetails?.plan_name === "Free" ? "Upgrade Plan" : "Change Plan"}
                  </button>
                </div>
                
                <div className="management-option">
                  <div className="option-info">
                    <h4>Switch Plan Type</h4>
                    <p>
                      Switch between Fixed ({planDetails?.plan_type === "fixed" ? "Current" : "Available"}) 
                      and Flexible ({planDetails?.plan_type === "flexible" ? "Current" : "Available"}) plans
                    </p>
                  </div>
                  <button className="btn-secondary" onClick={handleSwitchPlanType}>
                    Switch to {planDetails?.plan_type === "fixed" ? "Flexible" : "Fixed"}
                  </button>
                </div>
              </div>
            </div>

            {/* Storage Tips */}
            <div className="storage-card">
              <h2>Storage Tips</h2>
              
              <div className="storage-tips">
                <div className="tip-item">
                  <span className="tip-icon">💡</span>
                  <div className="tip-content">
                    <h4>Optimize Your Storage</h4>
                    <p>Compress large files and remove duplicates to save space</p>
                  </div>
                </div>
                
                <div className="tip-item">
                  <span className="tip-icon">📊</span>
                  <div className="tip-content">
                    <h4>Monitor Usage</h4>
                    <p>Keep track of your storage usage to avoid overage charges</p>
                  </div>
                </div>
                
                {planDetails?.plan_type === "flexible" && (
                  <div className="tip-item">
                    <span className="tip-icon">💰</span>
                    <div className="tip-content">
                      <h4>Pay-as-you-go</h4>
                      <p>Only pay for the storage you actually use each month</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Switch Plan Type Modal */}
        <ModalPortal>
        <div id="switchPlanModal" className="storage-modal-overlay hidden">
          <div className="modal-content">
            <h3>Switch Plan Type</h3>
            
            <div className="plan-type-comparison">
              <div className="plan-type-option">
                <h4>Fixed Plan</h4>
                <ul>
                  <li>Predictable monthly cost</li>
                  <li>Fixed storage allowance</li>
                  <li>Best for consistent usage</li>
                </ul>
              </div>
              
              <div className="plan-type-option">
                <h4>Flexible Plan</h4>
                <ul>
                  <li>Pay only for what you use</li>
                  <li>No storage limits</li>
                  <li>Best for variable usage</li>
                </ul>
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeSwitchModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => {
                closeSwitchModal();
                handleUpgradePlan();
              }}>
                Continue to Plan Selection
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      </div>
    </div>
  );
};

export default StoragePlansSection;