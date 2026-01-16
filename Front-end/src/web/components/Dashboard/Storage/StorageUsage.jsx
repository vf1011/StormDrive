// // import React, { useEffect, useState } from "react";
// // import { getAuth } from "firebase/auth";
// // import { HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';
// // import "./Styles/StorageUsage.css"

// // const StorageUsage = ({ collapsed }) => {
// //   const [storageData, setStorageData] = useState({
// //     used: "0 GB",
// //     total: "15 GB",
// //     percentage: 0,
// //     usedGB: 0,
// //     totalGB: 15,
// //   });

// //   const [alert, setAlert] = useState(null);

// //   useEffect(() => {
// //   const [fileTypeSegments, setFileTypeSegments] = useState([]);

// // const fetchStorageData = async () => {
// //   const auth = getAuth();
// //   const token = await auth.currentUser?.getIdToken();

// //   // 1. Fetch /storage/stats
// //   const statsRes = await fetch(`http://127.0.0.1:5000/storage/stats`, {
// //     headers: { Authorization: `Bearer ${token}` },
// //   });

// //   // 2. Fetch /storage/breakdown
// //   const breakdownRes = await fetch(`http://127.0.0.1:5000/storage/breakdown`, {
// //     headers: { Authorization: `Bearer ${token}` },
// //   });

// //   if (statsRes.ok && breakdownRes.ok) {
// //     const stats = await statsRes.json();
// //     const breakdown = await breakdownRes.json();

// //     // Same logic to compute storageData (your current part)
// //     const usedGB = stats.total_used_storage / (1024 ** 3);
// //     const totalGB = stats.total_storage / (1024 ** 3);
// //     const percentage = stats.used_storage_percentage;

// //     setStorageData({
// //       used: `${usedGB.toFixed(1)} GB`,
// //       total: `${totalGB.toFixed(1)} GB`,
// //       percentage,
// //       usedGB,
// //       totalGB
// //     });

// //     // Process active_files_breakdown
// //     const activeBreakdown = breakdown.active_files_breakdown;
// //     const segments = Object.entries(activeBreakdown).map(([type, data]) => ({
// //       type: type.toLowerCase(),
// //       label: type,
// //       percentage: data.percentage,
// //       size: data.size_gb.toFixed(2)
// //     }));

// //     setFileTypeSegments(segments);

// //     // Set alerts (same as before)
// //     if (percentage >= 90) {
// //       setAlert({
// //         type: 'critical',
// //         message: 'Storage almost full',
// //         color: 'storage-alert-critical'
// //       });
// //     } else if (percentage >= 70) {
// //       setAlert({
// //         type: 'warning',
// //         message: 'Storage getting full',
// //         color: 'storage-alert-warning'
// //       });
// //     } else {
// //       setAlert(null);
// //     }
// //   }
// // };

// //   }, []);

// //   const getProgressClass = () => {
// //     if (storageData.percentage >= 90) return 'storage-progress-critical';
// //     if (storageData.percentage >= 70) return 'storage-progress-warning';
// //     return 'storage-progress-normal';
// //   };

// //   // const getIcon = () => {
// //   //   if (storageData.percentage >= 90) {
// //   //     return <AlertTriangle className="storage-icon storage-icon-critical" size={16} />;
// //   //   } else if (storageData.percentage >= 70) {
// //   //     return <AlertTriangle className="storage-icon storage-icon-warning" size={16} />;
// //   //   } else {
// //   //     return <HardDrive className="storage-icon storage-icon-normal" size={16} />;
// //   //   }
// //   // };

// //   const handleClick = () => {
// //     // For now, just show an alert. Later we'll navigate to storage dashboard
// //     alert(`Storage Details:\n\nUsed: ${storageData.used}\nTotal: ${storageData.total}\nPercentage: ${storageData.percentage}%\n\nStorage dashboard coming soon!`);
// //   };

// //   return (
// //     <div className={`storage-container ${collapsed ? "collapsed" : ""}`}>
// //       {/* Alert Banner (only when not collapsed and there's an alert) */}
// //       {!collapsed && alert && (
// //         <div className={`storage-alert ${alert.color}`}>
// //           <AlertTriangle size={14} />
// //           <span>{alert.message}</span>
// //         </div>
// //       )}

// //       <div 
// //         className="storage-widget storage-clickable"
// //         onClick={handleClick}
// //         title="Click for storage details"
// //       >
// //         {!collapsed && (
// //           <div className="storage-header">
// //             <div className="storage-title">
// //               <h3>Storage</h3>
// //             </div>
// //             <span className="storage-total">{storageData.total}</span>
// //           </div>
// //         )}

// //         <div className="storage-progress-bg">
// //           {fileTypeSegments.map((seg, index) => (
// //           <div
// //             key={index}
// //             className={`storage-segment type-${seg.type}`}
// //             style={{ width: `${seg.percentage}%` }}
// //             title={`${seg.label}: ${seg.size} GB (${seg.percentage}%)`}
// //           />
// //         ))}

// //         </div>

// //         {!collapsed ? (
// //           <div className="storage-footer">
// //             <div className="used-label">{storageData.used} used</div>
// //             <div className="available-label">
// //               {(storageData.totalGB - storageData.usedGB).toFixed(1)} GB available
// //             </div>
// //           </div>
// //         ) : (
// //           <div className="storage-percentage">
// //             <span>{storageData.percentage}%</span>
// //           </div>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default StorageUsage;


// import React, { useEffect, useState } from "react";
// import { getAuth } from "firebase/auth";
// import { AlertTriangle } from "lucide-react";
// import "./Styles/StorageUsage.css";

// const StorageUsage = ({ collapsed }) => {
//   const [storageData, setStorageData] = useState({
//     used: "0 GB",
//     total: "15 GB",
//     percentage: 0,
//     usedGB: 0,
//     totalGB: 15,
//   });

//   const [fileTypeSegments, setFileTypeSegments] = useState([]);
//   const [alert, setAlert] = useState(null);

//   useEffect(() => {
//     const fetchStorageData = async () => {
//       try {
//         const auth = getAuth();
//         const token = await auth.currentUser?.getIdToken();

//         const statsRes = await fetch('http://127.0.0.1:5000/storage/stats', {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const breakdownRes = await fetch('http://127.0.0.1:5000/storage/breakdown', {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (statsRes.ok && breakdownRes.ok) {
//           const stats = await statsRes.json();
//           const breakdown = await breakdownRes.json();

//           const usedGB = stats.total_used_storage / (1024 ** 3);
//           const totalGB = stats.total_storage / (1024 ** 3);
//           const percentage = stats.used_storage_percentage;

//           setStorageData({
//             used: `${usedGB < 0.1 ? usedGB.toFixed(2) : usedGB.toFixed(1)} GB`,
//             total: `${totalGB.toFixed(1)} GB`,
//             percentage,
//             usedGB,
//             totalGB
//           });

//           // Prepare segments from active_files_breakdown
//           const breakdownData = breakdown.active_files_breakdown || {};
//           const segments = Object.entries(breakdownData).map(([type, info]) => ({
//             type: type.toLowerCase(),
//             label: type,
//             size: info.size_gb.toFixed(2),
//             percentage: info.percentage
//           }));
//           setFileTypeSegments(segments);

//           // Alerts
//           if (percentage >= 90) {
//             setAlert({ type: "critical", message: "Storage almost full", color: "storage-alert-critical" });
//           } else if (percentage >= 70) {
//             setAlert({ type: "warning", message: "Storage getting full", color: "storage-alert-warning" });
//           } else {
//             setAlert(null);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching storage data:", error);
//       }
//     };

//     fetchStorageData();
//     const interval = setInterval(fetchStorageData, 30000);
//     return () => clearInterval(interval);
//   }, []);

//   const handleClick = () => {
//     alert(`Storage Details:\n\nUsed: ${storageData.used}\nTotal: ${storageData.total}\n\nClick logic can be replaced with a real dashboard route.`);
//   };

  
//   return (
//     <div className={`storage-container ${collapsed ? "collapsed" : ""}`}>
//       {!collapsed && alert && (
//         <div className={`storage-alert ${alert.color}`}>
//           <AlertTriangle size={14} />
//           <span>{alert.message}</span>
//         </div>
//       )}

//       <div
//         className="storage-widget storage-clickable"
//         onClick={handleClick}
//         title="Click for storage details"
//       >
//         {!collapsed && (
//           <div className="storage-header">
//             <div className="storage-title">
//               <h3>Storage</h3>
//             </div>
//             <span className="storage-total">{storageData.total}</span>
//           </div>
//         )}

//         <div className="storage-progress-bg">
//           {Array.isArray(fileTypeSegments) &&
//   fileTypeSegments.map((seg, index) => {
//     const safeClass = seg.type.replace(/[\/+.]/g, '-');
//     return (
//       <div
//         key={index}
//         className={`storage-segment type-${safeClass}`}
//         style={{ width: `${seg.percentage}%` }}
//         title={`${seg.label}: ${seg.size} GB`}
//       />
//     );
//   })}
// s
//         </div>

//         {!collapsed ? (
//           <>
//             <div className="storage-footer">
//               <div className="used-label">{storageData.used} used</div>
//               <div className="available-label">
//                 {(storageData.totalGB - storageData.usedGB).toFixed(1)} GB available
//               </div>
//             </div>
//           </>
//         ) : (
//           <div className="storage-percentage">
//             <span>{storageData.percentage}%</span>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default StorageUsage;

import React, { useEffect, useState } from "react";
import { supabase } from "../../../../supabase";

import { AlertTriangle } from "lucide-react";
import "./Styles/StorageUsage.css";

const StorageUsage = ({ collapsed }) => {
  const [storageData, setStorageData] = useState({
    used: "0 GB",
    total: "15 GB",
    percentage: 0,
    usedGB: 0,
    totalGB: 15,
  });

  const [fileTypeSegments, setFileTypeSegments] = useState([]);
  const [alert, setAlert] = useState(null);

  // Helper function to categorize MIME types into user-friendly groups
  const getMimeTypeCategory = (mimeType) => {
    const categories = {
      'Documents': [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.ms-excel',
        'text/plain',
        'text/csv',
        'text/rtf'
      ],
      'Presentations': [
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-powerpoint'
      ],
      'PDFs': [
        'application/pdf'
      ],
      'Images': [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'image/bmp',
        'image/svg+xml',
        'image/webp',
        'image/tiff'
      ],
      'Videos': [
        'video/mp4',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/flv',
        'video/webm',
        'video/mkv'
      ],
      'Audio': [
        'audio/mp3',
        'audio/wav',
        'audio/flac',
        'audio/aac',
        'audio/ogg',
        'audio/m4a'
      ],
      'Archives': [
        'application/zip',
        'application/x-rar-compressed',
        'application/x-7z-compressed',
        'application/x-tar',
        'application/gzip',
        'application/x-bzip2'
      ]
    };

    // Find the category for this MIME type
    for (const [category, mimeTypes] of Object.entries(categories)) {
      if (mimeTypes.includes(mimeType)) {
        return category;
      }
    }

    // Handle special cases or return 'Other' for unknown types
    if (mimeType.startsWith('text/')) return 'Documents';
    if (mimeType.startsWith('image/')) return 'Images';
    if (mimeType.startsWith('video/')) return 'Videos';
    if (mimeType.startsWith('audio/')) return 'Audio';
    if (mimeType.includes('compressed') || mimeType.includes('zip')) return 'Archives';
    
    return 'Other';
  };

  // Helper function to get CSS class for visualization
  const getMimeTypeCssClass = (category) => {
    const cssClasses = {
      'Documents': 'documents',
      'Presentations': 'presentations',
      'PDFs': 'pdfs',
      'Images': 'images',
      'Videos': 'videos',
      'Audio': 'audio',
      'Archives': 'archives',
      'Other': 'other'
    };
    return cssClasses[category] || 'other';
  };

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        const statsRes = await fetch('http://127.0.0.1:5000/storage/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const breakdownRes = await fetch('http://127.0.0.1:5000/storage/breakdown', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (statsRes.ok && breakdownRes.ok) {
          const stats = await statsRes.json();
          const breakdown = await breakdownRes.json();

          console.log('🔍 Raw API Stats:', stats);
          console.log('🔍 Raw API Breakdown:', breakdown);

          // Calculate storage values
          const usedBytes = stats.total_used_storage || 0;
          const totalBytes = stats.total_storage || (15 * 1024 ** 3);
          
          const usedGB = usedBytes / (1024 ** 3);
          const totalGB = totalBytes / (1024 ** 3);
          const percentage = totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

          setStorageData({
            used: `${usedGB < 0.1 ? usedGB.toFixed(2) : usedGB.toFixed(1)} GB`,
            total: `${totalGB.toFixed(1)} GB`,
            percentage: Math.round(percentage * 100) / 100,
            usedGB,
            totalGB
          });

          // *** IMPROVED: Group by category instead of showing raw MIME types ***
          const breakdownData = breakdown.active_files_breakdown || {};
          console.log('📁 Raw breakdown data:', breakdownData);
          
          // Group by category
          const categoryGroups = {};
          
          Object.entries(breakdownData).forEach(([mimeType, info]) => {
            const category = getMimeTypeCategory(mimeType);
            
            if (!categoryGroups[category]) {
              categoryGroups[category] = {
                size_gb: 0,
                percentage: 0,
                mimeTypes: [],
                fileCount: 0
              };
            }
            
            categoryGroups[category].size_gb += info.size_gb || 0;
            categoryGroups[category].percentage += info.percentage || 0;
            categoryGroups[category].mimeTypes.push(mimeType);
            categoryGroups[category].fileCount += info.file_count || 0;
          });

          // Create segments from grouped categories
          let segments = Object.entries(categoryGroups)
            .map(([category, data]) => {
              // Calculate segment percentage based on total storage
              const segmentPercentage = totalBytes > 0 ? 
                ((data.size_gb * 1024 ** 3) / totalBytes) * 100 : 0;
              
              return {
                type: getMimeTypeCssClass(category),
                label: category,
                size: Number(data.size_gb).toFixed(2),

                percentage: Math.max(0, Math.min(segmentPercentage, 100)),
                fileCount: data.fileCount,
                mimeTypes: data.mimeTypes
              };
            })
            .filter(segment => segment.size > 0)
            .sort((a, b) => b.size - a.size); // Sort by size descending

          // Ensure segments don't exceed total usage percentage
          const totalSegmentPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0);
          if (totalSegmentPercentage > percentage && percentage > 0) {
            const scaleFactor = percentage / totalSegmentPercentage;
            segments = segments.map(seg => ({
              ...seg,
              percentage: seg.percentage * scaleFactor
            }));
          }

          console.log('📊 Grouped Segments:', segments);
          setFileTypeSegments(segments);

          // Set alerts
          if (percentage >= 90) {
            setAlert({ 
              type: "critical", 
              message: "Storage almost full", 
              color: "storage-alert-critical" 
            });
          } else if (percentage >= 70) {
            setAlert({ 
              type: "warning", 
              message: "Storage getting full", 
              color: "storage-alert-warning" 
            });
          } else {
            setAlert(null);
          }

        } else {
          console.error('API request failed:', {
            statsOk: statsRes.ok,
            breakdownOk: breakdownRes.ok
          });
        }
      } catch (error) {
        console.error("Error fetching storage data:", error);
        // Set safe defaults on error
        setStorageData({
          used: "0 GB",
          total: "15 GB",
          percentage: 0,
          usedGB: 0,
          totalGB: 15,
        });
        setFileTypeSegments([]);
        setAlert(null);
      }
    };

    fetchStorageData();
    const interval = setInterval(fetchStorageData, 30000);
    return () => clearInterval(interval);
  }, []);

 
  const formatFileSize = (sizeGB) => {
    const size = parseFloat(sizeGB);
    if (size >= 1) {
      return `${size.toFixed(1)} GB`;
    } else if (size >= 0.001) {
      return `${(size * 1024).toFixed(0)} MB`;
    } else {
      return `${(size * 1024 * 1024).toFixed(0)} KB`;
    }
  };

  

  return (
    <div className={`storage-container ${collapsed ? "collapsed" : ""}`}>
      {!collapsed && alert && (
        <div className={`storage-alert ${alert.color}`}>
          <AlertTriangle size={14} />
          <span>{alert.message}</span>
        </div>
      )}

      
        {!collapsed && (
          <div className="storage-header">
            <div className="storage-title">
              <h3>Storage</h3>
            </div>
            <span className="storage-total">{storageData.total}</span>
          </div>
        )}

        <div className="storage-progress-bg">
          {Array.isArray(fileTypeSegments) &&
            fileTypeSegments.map((seg, index) => (
              <div
                key={index}
                className={`storage-segment type-${seg.type}`}
                style={{ 
                  width: `${Math.max(0, Math.min(seg.percentage, 100))}%`,
                  minWidth: seg.percentage > 0 ? '2px' : '0'
                }}
                title={`${seg.label}: ${formatFileSize(seg.size)} (${seg.percentage.toFixed(1)}%)`}
              />
            ))}
        </div>

       {!collapsed ? (
        <div className="storage-footer">
          <div className="used-label">
            {storageData.usedGB.toFixed(2)} GB of {storageData.totalGB.toFixed(2)} GB used
          </div>
        </div>
      ) : (
          <div className="storage-percentage">
            {storageData.usedGB.toFixed(2)} GB of {storageData.totalGB.toFixed(2)} GB used
          </div>
      )}


        {!collapsed && fileTypeSegments.length > 0 && (
          <div className="storage-legend-dots">
            {fileTypeSegments.map((segment, index) => (
              <div key={index} className="legend-dot-item">
                <div className={`legend-dot type-${segment.type}`}></div>
                <span className="legend-text">
                  {segment.label} ({formatFileSize(segment.size)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
  );
};

export default StorageUsage;