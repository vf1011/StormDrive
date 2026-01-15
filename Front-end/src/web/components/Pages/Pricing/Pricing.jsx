// import React, { useState, useEffect } from 'react';
// import './Pricing.css';

// const Pricing = () => {
//   const [currentStep, setCurrentStep] = useState(1);
//   const [billingCycle, setBillingCycle] = useState('monthly');
//   const [pricingModel, setPricingModel] = useState('fixed');
//   const [selectedPlan, setSelectedPlan] = useState('');
//   const [customGB, setCustomGB] = useState(10);
//   const [selectedFeatures, setSelectedFeatures] = useState([]);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [processingTime, setProcessingTime] = useState(300);
//   const [paymentComplete, setPaymentComplete] = useState(false);
//   const [selectedFeatures, setSelectedFeatures] = useState([]);
//   const [expandedFeature, setExpandedFeature] = useState(null);

//   // Fixed pricing plans
//   const fixedPlans = {
//     basic: {
//       name: 'Basic',
//       monthly: 199,
//       yearly: 1590,
//       storage: '50 GB',
//       description: 'Perfect for individuals',
//       features: ['Basic encryption', 'Email support', 'File versioning', '5 monitors', 'Up to 2 seats'],
//       buttonText: 'Get started with Basic',
//       popular: false
//     },
//     pro: {
//       name: 'Pro',
//       monthly: 299,
//       yearly: 2390,
//       storage: '100 GB',
//       description: 'Great for small businesses',
//       features: ['Advanced encryption', 'Priority support', 'Team sharing', '20 monitors', 'Up to 6 seats'],
//       buttonText: 'Get started with Pro',
//       popular: true
//     },
//     enterprise: {
//       name: 'Enterprise',
//       monthly: 499,
//       yearly: 3990,
//       storage: '500 GB',
//       description: 'For multiple teams',
//       features: ['Everything in Pro', 'Advanced analytics', 'Custom integrations', '100 monitors', 'Unlimited seats'],
//       buttonText: 'Get started with Enterprise',
//       popular: false
//     }
//   };

//   // Additional features
//   // const features = [
//   //   {
//   //     id: 'delta-upload',
//   //     name: 'Smart Delta Upload',
//   //     price: 49,
//   //     description: 'Only upload changed parts of files for faster sync',
//   //     icon: '⚡'
//   //   },
//   //   {
//   //     id: 'temp-vaults',
//   //     name: 'Temporary Vaults',
//   //     price: 99,
//   //     description: 'Create secure, time-limited storage vaults',
//   //     icon: '🔒'
//   //   },
//   //   {
//   //     id: 'secured-signin',
//   //     name: 'Secured Sign-In',
//   //     price: 79,
//   //     description: 'Multi-factor authentication with biometric options',
//   //     icon: '🔑'
//   //   }
//   // ];

//    const features = [
//     {
//       id: 'delta-upload',
//       name: 'Smart Delta Upload',
//       price: 49,
//       description: 'Only upload changed parts of files for faster sync',
//       icon: '⚡',
//       color: 'blue',
//       details: 'Reduce upload time by up to 90% with intelligent file change detection.',
//       benefits: ['90% faster uploads', 'Reduced bandwidth usage', 'Real-time sync', 'All file types']
//     },
//     {
//       id: 'temp-vaults',
//       name: 'Temporary Vaults',
//       price: 99,
//       description: 'Create secure, time-limited storage vaults',
//       icon: '🔒',
//       color: 'green',
//       details: 'Create secure, time-limited storage containers that automatically delete.',
//       benefits: ['Auto-expiring links', 'Military-grade encryption', 'Access logging', 'Custom time limits']
//     },
//     {
//       id: 'secured-signin',
//       name: 'Enhanced Security Suite',
//       price: 79,
//       description: 'Multi-factor authentication with biometric options',
//       icon: '🔑',
//       color: 'purple',
//       details: 'Advanced security features including biometric authentication and AI threat detection.',
//       benefits: ['Biometric auth', 'Hardware key support', 'AI threat detection', 'Advanced audit logs']
//     },
//     {
//       id: 'ai-insights',
//       name: 'AI-Powered Analytics',
//       price: 129,
//       description: 'Get intelligent insights about your storage patterns',
//       icon: '🧠',
//       color: 'yellow',
//       details: 'Leverage AI to understand storage patterns and optimize file organization.',
//       benefits: ['Usage analysis', 'Auto organization', 'Predictive scaling', 'Cost optimization']
//     },
//     {
//       id: 'collaboration',
//       name: 'Advanced Collaboration Tools',
//       price: 89,
//       description: 'Real-time collaboration with advanced sharing controls',
//       icon: '👥',
//       color: 'red',
//       details: 'Enable seamless team collaboration with real-time editing and communication tools.',
//       benefits: ['Real-time co-editing', 'Granular permissions', 'Built-in chat', 'Version history']
//     }
//   ];


//   // // Calculate total price
//   // const calculateTotal = () => {
//   //   let basePrice = 0;
    
//   //   if (pricingModel === 'fixed' && selectedPlan) {
//   //     basePrice = fixedPlans[selectedPlan][billingCycle];
//   //   } else if (pricingModel === 'flexible') {
//   //     basePrice = customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1);
//   //   }
    
//   //   const featurePrice = selectedFeatures.reduce((sum, featureId) => {
//   //     const feature = features.find(f => f.id === featureId);
//   //     return sum + (feature ? feature.price * (billingCycle === 'yearly' ? 10 : 1) : 0);
//   //   }, 0);
    
//   //   return basePrice + featurePrice;
//   // };

//    const selectFeature = (featureId) => {
//     if (selectedFeatures.includes(featureId)) {
//       setSelectedFeatures(selectedFeatures.filter(id => id !== featureId));
//     } else {
//       setSelectedFeatures([...selectedFeatures, featureId]);
//     }
//   };

//   const toggleExpansion = (featureId) => {
//     setExpandedFeature(expandedFeature === featureId ? null : featureId);
//   };

//   const calculateTotal = () => {
//     return selectedFeatures.reduce((total, featureId) => {
//       const feature = features.find(f => f.id === featureId);
//       const multiplier = billingCycle === 'yearly' ? 10 : 1;
//       return total + (feature ? feature.price * multiplier : 0);
//     }, 0);
//   };


//   // Payment processing countdown
//   useEffect(() => {
//     let timer;
//     if (isProcessing && processingTime > 0) {
//       timer = setTimeout(() => setProcessingTime(processingTime - 1), 1000);
//     } else if (isProcessing && processingTime === 0) {
//       setPaymentComplete(true);
//       setIsProcessing(false);
//     }
//     return () => clearTimeout(timer);
//   }, [isProcessing, processingTime]);

//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const handleFeatureToggle = (featureId) => {
//     setSelectedFeatures(prev =>
//       prev.includes(featureId)
//         ? prev.filter(id => id !== featureId)
//         : [...prev, featureId]
//     );
//   };

//   const handlePayment = () => {
//     setIsProcessing(true);
//     setProcessingTime(300);
//   };

//   const resetFlow = () => {
//     setCurrentStep(1);
//     setPricingModel('');
//     setSelectedPlan('');
//     setSelectedFeatures([]);
//     setPaymentComplete(false);
//     setIsProcessing(false);
//     setProcessingTime(300);
//   };

//   // const styles = {
//   //   container: {
//   //     minHeight: '100vh',
//   //     background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
//   //     position: 'relative',
//   //     fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif'
//   //   },
//   //   successContainer: {
//   //     minHeight: '100vh',
//   //     background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
//   //     display: 'flex',
//   //     alignItems: 'center',
//   //     justifyContent: 'center',
//   //     padding: '20px'
//   //   },
//   //   successCard: {
//   //     background: 'white',
//   //     borderRadius: '16px',
//   //     boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
//   //     padding: '40px',
//   //     maxWidth: '400px',
//   //     width: '100%',
//   //     textAlign: 'center'
//   //   },
//   //   successIcon: {
//   //     fontSize: '64px',
//   //     marginBottom: '20px'
//   //   },
//   //   successSummary: {
//   //     background: '#f8f9fa',
//   //     borderRadius: '8px',
//   //     padding: '20px',
//   //     margin: '30px 0'
//   //   },
//   //   priceSummary: {
//   //     position: 'fixed',
//   //     top: '20px',
//   //     right: '20px',
//   //     background: 'white',
//   //     borderRadius: '12px',
//   //     boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
//   //     padding: '20px',
//   //     minWidth: '280px',
//   //     zIndex: 1000
//   //   },
//   //   processingOverlay: {
//   //     position: 'fixed',
//   //     top: 0,
//   //     left: 0,
//   //     right: 0,
//   //     bottom: 0,
//   //     background: 'rgba(0, 0, 0, 0.5)',
//   //     display: 'flex',
//   //     alignItems: 'center',
//   //     justifyContent: 'center',
//   //     zIndex: 2000
//   //   },
//   //   processingDialog: {
//   //     background: 'white',
//   //     borderRadius: '12px',
//   //     padding: '40px',
//   //     maxWidth: '400px',
//   //     width: '90%',
//   //     textAlign: 'center'
//   //   },
//   //   processingSpinner: {
//   //     fontSize: '48px',
//   //     marginBottom: '20px',
//   //     animation: 'spin 2s linear infinite'
//   //   },
//   //   mainContent: {
//   //     maxWidth: '1200px',
//   //     margin: '0 auto',
//   //     padding: '20px',
//   //     paddingRight: '320px',
//   //     minHeight: 'calc(100vh - 40px)',
//   //     display: 'flex',
//   //     flexDirection: 'column'
//   //   },
//   //   header: {
//   //     textAlign: 'center',
//   //     marginBottom: '30px'
//   //   },
//   //   headerTitle: {
//   //     fontSize: '32px',
//   //     fontWeight: 'bold',
//   //     color: '#333',
//   //     marginBottom: '8px',
//   //     margin: 0
//   //   },
//   //   headerSubtitle: {
//   //     fontSize: '16px',
//   //     color: '#666',
//   //     margin: 0
//   //   },
//   //   progressIndicator: {
//   //     display: 'flex',
//   //     justifyContent: 'center',
//   //     alignItems: 'center',
//   //     marginBottom: '30px'
//   //   },
//   //   stepCircle: {
//   //     width: '40px',
//   //     height: '40px',
//   //     borderRadius: '50%',
//   //     display: 'flex',
//   //     alignItems: 'center',
//   //     justifyContent: 'center',
//   //     fontSize: '14px',
//   //     fontWeight: 'bold',
//   //     transition: 'all 0.3s ease'
//   //   },
//   //   stepCircleInactive: {
//   //     background: '#e5e7eb',
//   //     color: '#6b7280'
//   //   },
//   //   stepCircleActive: {
//   //     background: '#2563eb',
//   //     color: 'white'
//   //   },
//   //   stepArrow: {
//   //     margin: '0 15px',
//   //     fontSize: '20px',
//   //     transition: 'color 0.3s ease'
//   //   },
//   //   stepArrowInactive: {
//   //     color: '#d1d5db'
//   //   },
//   //   stepArrowActive: {
//   //     color: '#2563eb'
//   //   },
//   //   billingToggle: {
//   //     display: 'flex',
//   //     justifyContent: 'center',
//   //     marginBottom: '25px'
//   //   },
//   //   toggleContainer: {
//   //     background: '#f3f4f6',
//   //     padding: '4px',
//   //     borderRadius: '8px',
//   //     display: 'flex'
//   //   },
//   //   toggleBtn: {
//   //     padding: '12px 24px',
//   //     border: 'none',
//   //     background: 'transparent',
//   //     borderRadius: '6px',
//   //     fontSize: '14px',
//   //     fontWeight: '500',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.2s ease',
//   //     color: '#6b7280'
//   //   },
//   //   toggleBtnActive: {
//   //     background: 'white',
//   //     color: '#333',
//   //     boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
//   //   },
//   //   saveBadge: {
//   //     color: '#10b981',
//   //     fontSize: '12px'
//   //   },
//   //   pricingModels: {
//   //     display: 'grid',
//   //     gridTemplateColumns: pricingModel === 'fixed' ? 'repeat(3, 1fr)' : (pricingModel === 'flexible' ? '1fr' : '1fr 1fr'),
//   //     gap: '25px',
//   //     marginBottom: '25px',
//   //     flex: 1
//   //   },
//   //   fixedPlanCard: {
//   //     border: '2px solid #e5e7eb',
//   //     borderRadius: '12px',
//   //     padding: '24px',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.3s ease',
//   //     background: 'white',
//   //     height: 'fit-content',
//   //     position: 'relative'
//   //   },
//   //   fixedPlanCardEnterprise: {
//   //     background: '#1f2937',
//   //     border: '2px solid #374151',
//   //     color: 'white'
//   //   },
//   //   popularBadge: {
//   //     position: 'absolute',
//   //     top: '-8px',
//   //     left: '50%',
//   //     transform: 'translateX(-50%)',
//   //     background: '#f97316',
//   //     color: 'white',
//   //     padding: '4px 12px',
//   //     borderRadius: '12px',
//   //     fontSize: '12px',
//   //     fontWeight: '500'
//   //   },
//   //   planTitle: {
//   //     fontSize: '18px',
//   //     fontWeight: '600',
//   //     marginBottom: '8px',
//   //     margin: 0
//   //   },
//   //   planTitleEnterprise: {
//   //     color: 'white'
//   //   },
//   //   planDescription: {
//   //     fontSize: '14px',
//   //     color: '#6b7280',
//   //     marginBottom: '16px',
//   //     margin: 0
//   //   },
//   //   planDescriptionEnterprise: {
//   //     color: '#d1d5db'
//   //   },
//   //   planPriceContainer: {
//   //     marginBottom: '20px'
//   //   },
//   //   planPriceAmount: {
//   //     fontSize: '36px',
//   //     fontWeight: 'bold',
//   //     color: '#111827',
//   //     margin: 0,
//   //     lineHeight: 1
//   //   },
//   //   planPriceAmountEnterprise: {
//   //     color: 'white'
//   //   },
//   //   planPricePeriod: {
//   //     fontSize: '14px',
//   //     color: '#6b7280',
//   //     margin: '4px 0 0 0'
//   //   },
//   //   planPricePeriodEnterprise: {
//   //     color: '#d1d5db'
//   //   },
//   //   planFeaturesList: {
//   //     listStyle: 'none',
//   //     padding: 0,
//   //     margin: '0 0 24px 0'
//   //   },
//   //   planFeatureItem: {
//   //     fontSize: '14px',
//   //     color: '#374151',
//   //     marginBottom: '8px',
//   //     display: 'flex',
//   //     alignItems: 'flex-start',
//   //     lineHeight: 1.4
//   //   },
//   //   planFeatureItemEnterprise: {
//   //     color: '#d1d5db'
//   //   },
//   //   planFeatureCheck: {
//   //     color: '#10b981',
//   //     marginRight: '8px',
//   //     fontWeight: 'bold',
//   //     fontSize: '12px',
//   //     marginTop: '2px',
//   //     flexShrink: 0
//   //   },
//   //   planButton: {
//   //     width: '100%',
//   //     padding: '12px 16px',
//   //     border: '1px solid #d1d5db',
//   //     borderRadius: '8px',
//   //     fontSize: '14px',
//   //     fontWeight: '500',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.2s ease',
//   //     background: 'white',
//   //     color: '#374151'
//   //   },
//   //   planButtonSelected: {
//   //     background: '#2563eb',
//   //     color: 'white',
//   //     borderColor: '#2563eb'
//   //   },
//   //   planButtonEnterprise: {
//   //     background: 'white',
//   //     color: '#1f2937',
//   //     border: '1px solid white'
//   //   },
//   //   planButtonEnterpriseSelected: {
//   //     background: '#4f46e5',
//   //     color: 'white',
//   //     borderColor: '#4f46e5'
//   //   },
//   //   pricingCard: {
//   //     border: '2px solid #e5e7eb',
//   //     borderRadius: '12px',
//   //     padding: '20px',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.3s ease',
//   //     background: 'white',
//   //     height: 'fit-content',
//   //     maxHeight: '500px',
//   //     overflow: 'auto'
//   //   },
//   //   pricingCardSelected: {
//   //     borderColor: '#2563eb',
//   //     background: '#eff6ff'
//   //   },
//   //   pricingCardTitle: {
//   //     fontSize: '20px',
//   //     fontWeight: 'bold',
//   //     marginBottom: '10px',
//   //     color: '#333',
//   //     margin: '0 0 10px 0'
//   //   },
//   //   planItem: {
//   //     border: '1px solid #e5e7eb',
//   //     borderRadius: '8px',
//   //     padding: '15px',
//   //     marginBottom: '10px',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.2s ease',
//   //     background: 'white'
//   //   },
//   //   planItemSelected: {
//   //     borderColor: '#2563eb',
//   //     background: '#eff6ff'
//   //   },
//   //   planHeader: {
//   //     display: 'flex',
//   //     justifyContent: 'space-between',
//   //     alignItems: 'flex-start',
//   //     marginBottom: '10px'
//   //   },
//   //   planPrice: {
//   //     fontSize: '20px',
//   //     fontWeight: 'bold',
//   //     color: '#333',
//   //     margin: 0
//   //   },
//   //   planPeriod: {
//   //     fontSize: '12px',
//   //     color: '#666',
//   //     margin: 0
//   //   },
//   //   planFeatures: {
//   //     listStyle: 'none',
//   //     padding: 0,
//   //     margin: 0
//   //   },
//   //   planFeature: {
//   //     fontSize: '13px',
//   //     color: '#666',
//   //     marginBottom: '4px',
//   //     display: 'flex',
//   //     alignItems: 'center'
//   //   },
//   //   checkIcon: {
//   //     color: '#10b981',
//   //     marginRight: '8px',
//   //     fontWeight: 'bold'
//   //   },
//   //   flexibleControls: {
//   //     marginTop: '15px'
//   //   },
//   //   gbInputContainer: {
//   //     display: 'flex',
//   //     gap: '10px',
//   //     alignItems: 'center',
//   //     marginBottom: '15px'
//   //   },
//   //   gbInput: {
//   //     flex: 1,
//   //     padding: '8px 12px',
//   //     border: '1px solid #d1d5db',
//   //     borderRadius: '6px',
//   //     fontSize: '14px',
//   //     outline: 'none'
//   //   },
//   //   gbInputFocused: {
//   //     borderColor: '#2563eb',
//   //     boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)'
//   //   },
//   //   gbLabel: {
//   //     fontSize: '14px',
//   //     fontWeight: '500',
//   //     color: '#333',
//   //     minWidth: '20px'
//   //   },
//   //   storageSlider: {
//   //     width: '100%',
//   //     marginBottom: '15px',
//   //     height: '6px',
//   //     borderRadius: '3px',
//   //     background: '#e5e7eb',
//   //     outline: 'none',
//   //     WebkitAppearance: 'none',
//   //     appearance: 'none'
//   //   },
//   //   sliderLabels: {
//   //     display: 'flex',
//   //     justifyContent: 'space-between',
//   //     fontSize: '11px',
//   //     color: '#666',
//   //     marginBottom: '15px'
//   //   },
//   //   currentValue: {
//   //     fontWeight: 'bold',
//   //     color: '#333'
//   //   },
//   //   flexiblePrice: {
//   //     background: 'white',
//   //     borderRadius: '8px',
//   //     padding: '15px',
//   //     border: '1px solid #e5e7eb',
//   //     textAlign: 'center'
//   //   },
//   //   flexiblePriceAmount: {
//   //     fontSize: '24px',
//   //     fontWeight: 'bold',
//   //     color: '#333',
//   //     margin: 0
//   //   },
//   //   featuresGrid: {
//   //     display: 'grid',
//   //     gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
//   //     gap: '20px',
//   //     marginBottom: '25px',
//   //     maxHeight: '400px',
//   //     overflow: 'auto'
//   //   },
//   //   featureCard: {
//   //     border: '2px solid #e5e7eb',
//   //     borderRadius: '12px',
//   //     padding: '20px',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.3s ease',
//   //     background: 'white',
//   //     height: 'fit-content'
//   //   },
//   //   featureCardSelected: {
//   //     borderColor: '#2563eb',
//   //     background: '#eff6ff'
//   //   },
//   //   featureHeader: {
//   //     display: 'flex',
//   //     justifyContent: 'space-between',
//   //     alignItems: 'center',
//   //     marginBottom: '15px'
//   //   },
//   //   featureIcon: {
//   //     fontSize: '28px'
//   //   },
//   //   checkbox: {
//   //     width: '24px',
//   //     height: '24px',
//   //     border: '2px solid #d1d5db',
//   //     borderRadius: '50%',
//   //     display: 'flex',
//   //     alignItems: 'center',
//   //     justifyContent: 'center',
//   //     transition: 'all 0.2s ease'
//   //   },
//   //   checkboxChecked: {
//   //     borderColor: '#2563eb',
//   //     background: '#2563eb',
//   //     color: 'white'
//   //   },
//   //   stepActions: {
//   //     display: 'flex',
//   //     justifyContent: 'space-between',
//   //     alignItems: 'center',
//   //     marginTop: '20px',
//   //     paddingTop: '20px',
//   //     borderTop: '1px solid #e5e7eb'
//   //   },
//   //   Btn: {
//   //     padding: '12px 24px',
//   //     border: 'none',
//   //     borderRadius: '8px',
//   //     fontSize: '16px',
//   //     fontWeight: '500',
//   //     cursor: 'pointer',
//   //     transition: 'all 0.2s ease',
//   //     textDecoration: 'none',
//   //     display: 'inline-flex',
//   //     alignItems: 'center',
//   //     gap: '8px'
//   //   },
//   //   BtnPrimary: {
//   //     background: '#2563eb',
//   //     color: 'white'
//   //   },
//   //   BtnSecondary: {
//   //     background: 'transparent',
//   //     color: '#374151',
//   //     border: '1px solid #d1d5db'
//   //   },
//   //   BtnSuccess: {
//   //     background: '#059669',
//   //     color: 'white',
//   //     padding: '16px 32px',
//   //     fontSize: '18px',
//   //     fontWeight: '600'
//   //   },
//   //   BtnDisabled: {
//   //     opacity: 0.5,
//   //     cursor: 'not-allowed'
//   //   },
//   //   orderDetails: {
//   //     background: 'white',
//   //     borderRadius: '12px',
//   //     border: '1px solid #e5e7eb',
//   //     padding: '25px',
//   //     marginBottom: '20px',
//   //     maxWidth: '600px',
//   //     margin: '0 auto 20px auto'
//   //   },
//   //   orderItem: {
//   //     display: 'flex',
//   //     justifyContent: 'space-between',
//   //     alignItems: 'flex-start',
//   //     marginBottom: '15px'
//   //   },
//   //   itemName: {
//   //     fontSize: '16px',
//   //     fontWeight: '500',
//   //     color: '#333',
//   //     margin: 0
//   //   },
//   //   itemDetails: {
//   //     fontSize: '14px',
//   //     color: '#666',
//   //     marginTop: '2px',
//   //     margin: '2px 0 0 0'
//   //   },
//   //   itemPrice: {
//   //     fontSize: '16px',
//   //     fontWeight: '600',
//   //     color: '#333'
//   //   },
//   //   orderTotal: {
//   //     borderTop: '1px solid #e5e7eb',
//   //     paddingTop: '20px'
//   //   },
//   //   totalRow: {
//   //     display: 'flex',
//   //     justifyContent: 'space-between',
//   //     fontSize: '24px',
//   //     fontWeight: 'bold',
//   //     color: '#333'
//   //   },
//   //   totalPeriod: {
//   //     fontSize: '14px',
//   //     color: '#666',
//   //     textAlign: 'right',
//   //     marginTop: '5px'
//   //   },
//   //   paymentOption: {
//   //     display: 'flex',
//   //     alignItems: 'center',
//   //     padding: '20px',
//   //     border: '1px solid #e5e7eb',
//   //     borderRadius: '8px'
//   //   },
//   //   paymentIcon: {
//   //     fontSize: '24px',
//   //     marginRight: '15px'
//   //   }
//   // };

//   if (paymentComplete) {
//     return (
//       <div className='successContainer'>
//         <div className='successCard'>
//           <div className='successIcon'>✅</div>
//           <h2 style={{margin: '0 0 10px 0'}}>Payment Successful!</h2>
//           <p style={{color: '#666', margin: '0 0 30px 0'}}>Your StormDrive subscription is now active</p>
          
//           <div className='successSummary'>
//             <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total Amount</div>
//             <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333', margin: 0}}>₹{calculateTotal().toLocaleString()}</div>
//             <div style={{fontSize: '14px', color: '#666', margin: 0}}>{billingCycle === 'yearly' ? 'per year' : 'per month'}</div>
//           </div>
          
//           <button onClick={resetFlow} className='Btn BtnPrima Btn-full-width'>
//             Start New Order
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className='pricing-container'>
//       {/* Sticky Price Summary */}
//       <div className='priceSummary'>
//         <h3 style={{margin: '0 0 15px 0'}}>Price Summary</h3>
//         <div style={{marginBottom: '15px'}}>
//           {pricingModel === 'fixed' && selectedPlan && (
//             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666'}}>
//               <span>{fixedPlans[selectedPlan].name} Plan</span>
//               <span>₹{fixedPlans[selectedPlan][billingCycle].toLocaleString()}</span>
//             </div>
//           )}
//           {pricingModel === 'flexible' && (
//             <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666'}}>
//               <span>{customGB} GB Storage</span>
//               <span>₹{(customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</span>
//             </div>
//           )}
//           {selectedFeatures.map(featureId => {
//             const feature = features.find(f => f.id === featureId);
//             return (
//               <div key={featureId} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#666'}}>
//                 <span>{feature.name}</span>
//                 <span>₹{(feature.price * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</span>
//               </div>
//             );
//           })}
//         </div>
//         <div style={{borderTop: '1px solid #eee', paddingTop: '15px'}}>
//           <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#333'}}>
//             <span>Total</span>
//             <span>₹{calculateTotal().toLocaleString()}</span>
//           </div>
//           <div style={{fontSize: '12px', color: '#666', textAlign: 'right', marginTop: '2px'}}>{billingCycle === 'yearly' ? 'per year' : 'per month'}</div>
//         </div>
//       </div>

//       {/* Processing Dialog */}
//       {isProcessing && (
//         <div className='processingOverlay'>
//           <div className='processingDialog'>
//             <div className='processingSpinner'>⏳</div>
//             <h3 style={{margin: '0 0 10px 0'}}>Processing Payment</h3>
//             <p style={{color: '#666', margin: '0 0 20px 0'}}>Please wait while we process your payment securely</p>
//             <div style={{fontSize: '28px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 'bold'}}>{formatTime(processingTime)}</div>
//           </div>
//         </div>
//       )}

//       <div className='mainContent'>
//         {/* Header */}
//         <div className='header'>
//           <h1 className='headerTitle'>Choose Your StormDrive Plan</h1>
//           <p className='headerSubtitle'>Secure, flexible cloud storage that scales with your needs</p>
//         </div>

//         {/* Progress Indicator */}
//         <div className='progressIndicator'>
//           {[1, 2, 3].map((step) => (
//             <div key={step} style={{display: 'flex', alignItems: 'center'}}>
//               <div className={`stepCircle ${currentStep >= step ? 'active' : 'inactive'}`}>
//                 {step}
//               </div>
//               {step < 3 && (
//                 <div className={`stepArrow ${currentStep >= step ? 'active' : 'inactive'}`}>→</div>
//               )}
//             </div>
//           ))}
//         </div>

//         {/* Step 1: Pricing Selection */}
//         {currentStep === 1 && (
//           <div>
//             {/* Billing Toggle */}
//             <div className='billingToggle'>
//               <div className='toggleContainer'>
//                 <button
//                   onClick={() => setBillingCycle('monthly')}
//                  className={billingCycle === 'monthly' ? 'toggleBtn active' : 'toggleBtn'}
//                 >
//                   Monthly
//                 </button>
//                 <button
//                   onClick={() => setBillingCycle('yearly')}
//                   className={billingCycle === 'yearly' ? 'toggleBtn active' : 'toggleBtn'}
//                 >
//                   Yearly 
//                 </button>
//               </div>
//             </div>

//             {/* Pricing Model Toggle */}
//             <div className="billingToggle extra-margin">
//               <div className='toggleContainer'>
//                 <button
//                   onClick={() => {
//                     setPricingModel('fixed');
//                     setSelectedPlan(''); // Reset selected plan when switching
//                   }}
//                   className={pricingModel === 'fixed' ? 'toggleBtn active' : 'toggleBtn'}
//                 >
//                   Fixed Plans
//                 </button>
//                 <button
//                   onClick={() => {
//                     setPricingModel('flexible');
//                     setSelectedPlan(''); // Reset when switching
//                   }}
//                   className={pricingModel === 'flexible' ? 'toggleBtn active' : 'toggleBtn'}
//                 >
//                   Flexible Pricing 
//                 </button>
//               </div>
//             </div>

//             {/* Pricing Content */}
//             <div className={`pricing-models ${pricingModel === 'fixed' ? 'three-column' : 'one-column'}`}>

              
//               {/* Fixed Pricing - Show only when selected or when nothing is selected */}
//               {(pricingModel === 'fixed' || !pricingModel) && (
//                 <>
//                   {Object.entries(fixedPlans).map(([key, plan]) => {
//                     const isSelected = selectedPlan === key;
//                     const isInteractive = pricingModel === 'fixed' || !pricingModel;
                    
//                     return (
//                       <div
//                         key={key}
//                         className={`fixed-plan-card 
//                                     ${isSelected ? 'selected' : ''} 
//                                     ${!isInteractive ? 'inactive' : ''}`}
//                         onClick={() => {
//                           if (isInteractive) {
//                             setPricingModel('fixed');
//                             setSelectedPlan(key);
//                           }
//                         }}
//                       >
//                         <h3 className="plan-title">
//                           {plan.name}
//                         </h3>

//                         <p className="plan-description">
//                           {plan.description}
//                         </p>

//                         <div className='planPriceContainer'>
//                           <div className='plan-price-amount'>
//                             {plan.monthly === 0 ? '₹0' : plan.storage === 'Custom' ? 'Custom' : `₹${plan[billingCycle].toLocaleString()}`}
//                           </div>
//                           {plan.monthly !== 0 && plan.storage !== 'Custom' && (
//                             <div className='plan-price-period'>
//                               Per user/month, billed {billingCycle === 'yearly' ? 'annually' : 'monthly'}
//                             </div>
//                           )}
//                         </div>

//                         <ul className='planFeaturesList'>
//                           {plan.features.map((feature, idx) => (
//                             <li key={idx} className='plan-feature-item'>
//                               <span className='planFeatureCheck'>✓</span>
//                               <span>{feature}</span>
//                             </li>
//                           ))}
//                         </ul>
                        
//                         <button
//                            className={`plan-button 
//                                       ${isSelected ? 'selected' : ''} `}
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             if (isInteractive) {
//                               setPricingModel('fixed');
//                               setSelectedPlan(key);
//                             }
//                           }}
//                         >
//                           {isSelected ? 'Selected' : plan.buttonText}
//                         </button>
//                       </div>
//                     );
//                   })}
//                 </>
//               )}

//               {/* Flexible Pricing - Show only when selected or when nothing is selected */}
//               {(pricingModel === 'flexible' || !pricingModel) && pricingModel !== 'fixed' && (
//                 <div className={`flexible-pricing-card ${pricingModel === 'flexible' ? 'selected' : ''} ${pricingModel && pricingModel !== 'flexible' ? 'disabled' : ''}`}>
//                   <h3 className='pricingCardTitle'>Flexible Pricing</h3>
//                   <p style={{color: '#666', margin: '0 0 20px 0'}}>Pay only for what you need at ₹1.25 per GB</p>
                  
//                   {(pricingModel === 'flexible' || !pricingModel) && (
//                     <div className={`flexible-controls ${pricingModel !== 'flexible' ? 'disabled' : ''}`}>
//                       <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '10px', color: 'var(--text-secondary)'}}>Storage Amount</label>
                      
//                       {/* Manual GB Input */}
//                       <div className='gbInputContainer'>
//                         <input
//                           type="number"
//                           min=""
//                           max="10000"
//                           value={customGB}
//                           onChange={(e) => {
//                             if (pricingModel === 'flexible') {
//                               const value = Math.max( Math.min(10000, parseInt(e.target.value)));
//                               setCustomGB(value);
//                             }
//                           }}
//                           className='gbInput'
//                           placeholder="Enter GB"
//                           disabled={pricingModel !== 'flexible'}
//                         />
//                         <span className='gbLabel' style={{ color : 'var(--text-secondary)'}}>GB</span>
//                       </div>
                      
        
//                       <div className='flexible-price'>
//                         <div  className='flexible-price-amount small'>₹{(customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</div>
//                         <div style={{fontSize: '13px', color: '#666', margin: 0}}>/{billingCycle === 'yearly' ? 'year' : 'month'}</div>
//                         <div style={{fontSize: '11px', color: '#999', marginTop: '5px'}}>₹1.25 per GB</div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className='stepActions'>
//               <div></div>
//               <button
//                 onClick={() => setCurrentStep(2)}
//                 disabled={!pricingModel || (pricingModel === 'fixed' && !selectedPlan)}
//                 className={`Btn BtnPrimary
//    ${(!pricingModel || (pricingModel === 'fixed' && !selectedPlan)) ? 'Btn-disabled' : ''}`}
//               >
//                 Continue to Features →
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Step 2: Feature Selection */}
//         {currentStep === 2 && (
//           <div>
//             <div style={{textAlign: 'center', marginBottom: '25px'}}>
//               <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 8px 0'}}>Enhance Your Experience</h2>
//               <p style={{fontSize: '16px', color: '#666', margin: 0}}>Add optional features to customize your StormDrive experience</p>
//             </div>

//             <div className='featuresGrid'>
//               {features.map((feature) => {
//                 const isSelected = selectedFeatures.includes(feature.id);
                
//                 return (
//                   <div
//                     key={feature.id}
//                     className={`feature-card ${isSelected ? 'selected' : ''}`}
//                     onClick={() => handleFeatureToggle(feature.id)}
//                   >
//                     <div className='featureHeader'>
//                       <span className='featureIcon'>{feature.icon}</span>
//                       <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
//                         {isSelected && '✓'}
//                       </div>
//                     </div>
//                     <h3 style={{fontSize: '18px', fontWeight: '600', margin: '0 0 10px 0', color: '#333'}}>{feature.name}</h3>
//                     <p style={{fontSize: '14px', color: '#666', margin: '0 0 20px 0'}}>{feature.description}</p>
//                     <div style={{fontSize: '20px', fontWeight: 'bold', color: '#333'}}>
//                       +₹{(feature.price * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}
//                       <span style={{fontSize: '14px', fontWeight: 'normal', color: '#666'}}>/{billingCycle === 'yearly' ? 'year' : 'month'}</span>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>

//             <div className='stepActions'>
//               <button onClick={() => setCurrentStep(1)} className="Btn Btn-secondary">
//                 ← Back to Pricing
//               </button>
//               <button onClick={() => setCurrentStep(3)} className="Btn BtnPrimary">
//                 Continue to Payment →
//               </button>
//             </div>
//           </div>
//         )}

        


//         {/* Step 3: Payment Summary */}
//         {currentStep === 3 && (
//           <div>
//             <div style={{textAlign: 'center', marginBottom: '25px'}}>
//               <h2 style={{fontSize: '24px', fontWeight: 'bold', color: '#333', margin: '0 0 8px 0'}}>Payment Summary</h2>
//               <p style={{fontSize: '16px', color: '#666', margin: 0}}>Review your order before completing the purchase</p>
//             </div>

//             <div className='order-details'>
//               <h3 style={{fontSize: '20px', fontWeight: '600', color: '#333', margin: '0 0 20px 0'}}>Order Details</h3>
              
//               <div style={{marginBottom: '20px'}}>
//                 {pricingModel === 'fixed' && selectedPlan && (
//                   <div className='orderIte'>
//                     <div>
//                       <div className='itemName'>{fixedPlans[selectedPlan].name} Plan</div>
//                       <div className='itemDetails'>{fixedPlans[selectedPlan].storage} • {billingCycle}</div>
//                     </div>
//                     <div className='itemPrice'>₹{fixedPlans[selectedPlan][billingCycle].toLocaleString()}</div>
//                   </div>
//                 )}
                
//                 {pricingModel === 'flexible' && (
//                   <div className='orderItem'>
//                     <div>
//                       <div className='itemName'>Flexible Storage</div>
//                       <div className='itemDetails'>{customGB} GB • {billingCycle}</div>
//                     </div>
//                     <div className='itemPrice'>₹{(customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</div>
//                   </div>
//                 )}
                
//                 {selectedFeatures.map(featureId => {
//                   const feature = features.find(f => f.id === featureId);
//                   return (
//                     <div key={featureId} className='orderItem'>
//                       <div>
//                         <div className='itemName'>{feature.name}</div>
//                         <div className='itemDetails'>{billingCycle}</div>
//                       </div>
//                       <div className='itemPrice'>₹{(feature.price * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</div>
//                     </div>
//                   );
//                 })}
//               </div>

//               <div className='orderTotal'>
//                 <div className='totalRow'>
//                   <span>Total</span>
//                   <span>₹{calculateTotal().toLocaleString()}</span>
//                 </div>
//                 <div className='totalPeriod'>{billingCycle === 'yearly' ? 'per year' : 'per month'}</div>
//               </div>
//             </div>

//             <div className="order-details order-details-bottom">
//               <h3 style={{fontSize: '20px', fontWeight: '600', color: '#333', margin: '0 0 20px 0'}}>Payment Method</h3>
//               <div className='paymentOption'>
//                 <span className='paymentIcon'>💳</span>
//                 <div>
//                   <div style={{fontSize: '16px', fontWeight: '500', color: '#333', margin: 0}}>Credit/Debit Card</div>
//                   <div style={{fontSize: '14px', color: '#666', margin: 0}}>Secure payment processing</div>
//                 </div>
//               </div>
//             </div>

//             <div className='stepActions'>
//               <button onClick={() => setCurrentStep(2)} className="Btn Btn-secondary">
//                 ← Back to Features
//               </button>
//               <button onClick={handlePayment} className="Btn Btn-success">
//                 Complete Payment 💳
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Pricing;


import React, { useState, useEffect } from 'react';
import './Pricing.css';

const Pricing = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [pricingModel, setPricingModel] = useState('fixed');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [customGB, setCustomGB] = useState(10);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [expandedFeature, setExpandedFeature] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState(300);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    walletProvider: '',
    walletPhone: '',
    accountHolderName: '',
    bankAccountNumber: '',
    routingNumber: '',
    cryptoWallet: '',
    cryptoType: 'bitcoin'
  });

  // Fixed pricing plans
  const fixedPlans = {
    basic: {
      name: 'Basic',
      monthly: 199,
      yearly: 1590,
      storage: '50 GB',
      description: 'Perfect for individuals',
      features: ['Basic encryption', 'Email support', 'File versioning', '5 monitors', 'Up to 2 seats'],
      buttonText: 'Get started with Basic',
      popular: false
    },
    pro: {
      name: 'Pro',
      monthly: 299,
      yearly: 2390,
      storage: '100 GB',
      description: 'Great for small businesses',
      features: ['Advanced encryption', 'Priority support', 'Team sharing', '20 monitors', 'Up to 6 seats'],
      buttonText: 'Get started with Pro',
      popular: true
    },
    enterprise: {
      name: 'Enterprise',
      monthly: 499,
      yearly: 3990,
      storage: '500 GB',
      description: 'For multiple teams',
      features: ['Everything in Pro', 'Advanced analytics', 'Custom integrations', '100 monitors', 'Unlimited seats'],
      buttonText: 'Get started with Enterprise',
      popular: false
    }
  };

  // Features for step 2
  const features = [
    {
      id: 'delta-upload',
      name: 'Smart Delta Upload',
      price: 49,
      description: 'Only upload changed parts of files for faster sync',
      icon: '⚡',
      color: 'blue',
      details: 'Reduce upload time by up to 90% with intelligent file change detection.',
      benefits: ['90% faster uploads', 'Reduced bandwidth usage', 'Real-time sync', 'All file types']
    },
    {
      id: 'temp-vaults',
      name: 'Temporary Vaults',
      price: 99,
      description: 'Create secure, time-limited storage vaults',
      icon: '🔒',
      color: 'green',
      details: 'Create secure, time-limited storage containers that automatically delete.',
      benefits: ['Auto-expiring links', 'Military-grade encryption', 'Access logging', 'Custom time limits']
    },
    {
      id: 'secured-signin',
      name: 'Enhanced Security Suite',
      price: 79,
      description: 'Multi-factor authentication with biometric options',
      icon: '🔑',
      color: 'purple',
      details: 'Advanced security features including biometric authentication and AI threat detection.',
      benefits: ['Biometric auth', 'Hardware key support', 'AI threat detection', 'Advanced audit logs']
    },
    {
      id: 'ai-insights',
      name: 'AI-Powered Analytics',
      price: 129,
      description: 'Get intelligent insights about your storage patterns',
      icon: '🧠',
      color: 'yellow',
      details: 'Leverage AI to understand storage patterns and optimize file organization.',
      benefits: ['Usage analysis', 'Auto organization', 'Predictive scaling', 'Cost optimization']
    },
    {
      id: 'collaboration',
      name: 'Advanced Collaboration Tools',
      price: 89,
      description: 'Real-time collaboration with advanced sharing controls',
      icon: '👥',
      color: 'red',
      details: 'Enable seamless team collaboration with real-time editing and communication tools.',
      benefits: ['Real-time co-editing', 'Granular permissions', 'Built-in chat', 'Version history']
    }
  ];


  const paymentMethods = [
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Secure payment processing with Visa, Mastercard, Rupay',
      image: '💳',
      popular: true,
      processingTime: 'Instant',
      fees: 'No additional fees'
    },
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using Google Pay, PhonePe, Paytm, or any UPI app',
      icon: '📱',
      popular: true,
      processingTime: 'Instant',
      fees: 'No additional fees'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      description: 'Direct bank transfer from your savings account',
      icon: '🏦',
      popular: false,
      processingTime: 'Instant',
      fees: 'No additional fees'
    },
    // {
    //   id: 'wallet',
    //   name: 'Digital Wallet',
    //   description: 'Paytm, PhonePe, Amazon Pay, and other wallets',
    //   icon: '👛',
    //   popular: false,
    //   processingTime: 'Instant',
    //   fees: 'No additional fees'
    // },
    // {
    //   id: 'banktransfer',
    //   name: 'Bank Transfer',
    //   description: 'Wire transfer or ACH payment',
    //   icon: '🔄',
    //   popular: false,
    //   processingTime: '1-3 business days',
    //   fees: 'Bank charges may apply'
    // },
    // {
    //   id: 'crypto',
    //   name: 'Cryptocurrency',
    //   description: 'Bitcoin, Ethereum, and other cryptocurrencies',
    //   icon: '₿',
    //   popular: false,
    //   processingTime: '10-60 minutes',
    //   fees: 'Network fees apply'
    // }
  ];

  // Simple feature selection function
  // const selectFeature = (featureId) => {
  //   if (selectedFeatures.includes(featureId)) {
  //     setSelectedFeatures(selectedFeatures.filter(id => id !== featureId));
  //   } else {
  //     setSelectedFeatures([...selectedFeatures, featureId]);
  //   }
  // };

  // // Simple expansion function
  // const toggleExpansion = (featureId) => {
  //   setExpandedFeature(expandedFeature === featureId ? null : featureId);
  // };

  //  const handleInputChange = (field, value) => {
  //   setPaymentDetails(prev => ({
  //     ...prev,
  //     [field]: value
  //   }));
  // };

  const selectFeature = (featureId) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Enhanced expansion function
  const toggleExpansion = (featureId) => {
    setExpandedFeature(expandedFeature === featureId ? null : featureId);
  };

  const handleInputChange = (field, value) => {
    setPaymentDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate total price including base plan and features
  const calculateTotal = () => {
    let basePrice = 0;
    
    if (pricingModel === 'fixed' && selectedPlan) {
      basePrice = fixedPlans[selectedPlan][billingCycle];
    } else if (pricingModel === 'flexible') {
      basePrice = customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1);
    }
    
    const featurePrice = selectedFeatures.reduce((sum, featureId) => {
      const feature = features.find(f => f.id === featureId);
      return sum + (feature ? feature.price * (billingCycle === 'yearly' ? 10 : 1) : 0);
    }, 0);
    
    return basePrice + featurePrice;
  };

  // Payment processing countdown
  useEffect(() => {
    let timer;
    if (isProcessing && processingTime > 0) {
      timer = setTimeout(() => setProcessingTime(processingTime - 1), 1000);
    } else if (isProcessing && processingTime === 0) {
      setPaymentComplete(true);
      setIsProcessing(false);
    }
    return () => clearTimeout(timer);
  }, [isProcessing, processingTime]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = () => {
    setIsProcessing(true);
    setProcessingTime(300);
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setPricingModel('fixed');
    setSelectedPlan('');
    setSelectedFeatures([]);
    setExpandedFeature(null);
    setPaymentComplete(false);
    setIsProcessing(false);
    setProcessingTime(300);
  };

  if (paymentComplete) {
    return (
      <div className='successContainer'>
        <div className='successCard'>
          <div className='successIcon'>✅</div>
          <h2 style={{margin: '0 0 10px 0'}}>Payment Successful!</h2>
          <p style={{color: '#666', margin: '0 0 30px 0'}}>Your StormDrive subscription is now active</p>
          
          <div className='successSummary'>
            <div style={{fontSize: '14px', color: '#666', marginBottom: '5px'}}>Total Amount</div>
            <div style={{fontSize: '32px', fontWeight: 'bold', color: '#333', margin: 0}}>₹{calculateTotal().toLocaleString()}</div>
            <div style={{fontSize: '14px', color: '#666', margin: 0}}>{billingCycle === 'yearly' ? 'per year' : 'per month'}</div>
          </div>
          
          <button onClick={resetFlow} className='Btn BtnPrimary'>
            Start New Order
          </button>
        </div>
      </div>
    );
  }

  const renderPaymentForm = () => {
    switch(selectedPaymentMethod) {
      case 'card':
        return (
          <div style={{padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '16px' , border: '1px solid var(--border)' }}>
            <h4 style={{margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' , color:'var(--text-primary)'}}>Card Details</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '16px'}}>
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                  Card Number
                </label>
                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={paymentDetails.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                <div>
                  <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={paymentDetails.expiryDate}
                    onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                    CVV
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    value={paymentDetails.cvv}
                    onChange={(e) => handleInputChange('cvv', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px'
                    }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={paymentDetails.cardHolderName}
                  onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'upi':
        return (
          <div style={{padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '16px', border: '1px solid var(--border)'}}>
            <h4 style={{margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color:'var(--text-primary)'}}>UPI Details</h4>
            
            <div>
              <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                UPI ID
              </label>
              <input
                type="text"
                placeholder="yourname@paytm"
                value={paymentDetails.upiId}
                onChange={(e) => handleInputChange('upiId', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              />
              <p style={{fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px'}}>
                Enter your UPI ID from any UPI app (Google Pay, PhonePe, Paytm, etc.)
              </p>
            </div>
          </div>
        );

      case 'netbanking':
        return (
          <div style={{padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '16px', border: '1px solid var(--border)'}}>
            <h4 style={{margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)'}}>Net Banking Details</h4>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '16px'}}>
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                  Select Bank
                </label>
                <select
                  value={paymentDetails.bankName}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                >
                  <option value="">Choose your bank</option>
                  <option value="sbi">State Bank of India</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                  <option value="kotak">Kotak Mahindra Bank</option>
                  <option value="pnb">Punjab National Bank</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="Enter account number"
                  value={paymentDetails.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
              
              <div>
                <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-secondary)'}}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="SBIN0001234"
                  value={paymentDetails.ifscCode}
                  onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '16px'
                  }}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (

    <div className='pricing-container'>

      <div className="wave-background">
        <div className="wave">
          <span className="wave-span wave-1"></span>
          <span className="wave-span wave-2"></span>
          <span className="wave-span wave-3"></span>
        </div>
      </div>

      {/* <div className="lines">
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div> */}

      {/* Sticky Price Summary */}
      {currentStep !== 3 && ( // Hides price summary on payment page
  <div className='priceSummary'>
    <h3 style={{margin: '0 0 15px 0', color:'var(--text-primary)'}}>Price Summary</h3>
    <div style={{marginBottom: '15px'}}>
      {pricingModel === 'fixed' && selectedPlan && (
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>
          <span>{fixedPlans[selectedPlan].name} Plan</span>
          <span>₹{fixedPlans[selectedPlan][billingCycle].toLocaleString()}</span>
        </div>
      )}
      {pricingModel === 'flexible' && (
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>
          <span>{customGB} GB Storage</span>
          <span>₹{(customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</span>
        </div>
      )}
      {selectedFeatures.map(featureId => {
        const feature = features.find(f => f.id === featureId);
        return (
          <div key={featureId} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)'}}>
            <span>{feature.name}</span>
            <span>₹{(feature.price * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</span>
          </div>
        );
      })}
    </div>
    <div style={{borderTop: '1px solid #eee', paddingTop: '15px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: 'var(--text-secondary)'}}>
        <span>Total</span>
        <span>₹{calculateTotal().toLocaleString()}</span>
      </div>
      <div style={{fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right', marginTop: '2px'}}>{billingCycle === 'yearly' ? 'per year' : 'per month'}</div>
    </div>
  </div>
)}


      {/* Processing Dialog */}
      {isProcessing && (
        <div className='processingOverlay'>
          <div className='processingDialog'>
            <div className='processingSpinner'>⏳</div>
            <h3 style={{margin: '0 0 10px 0'}}>Processing Payment</h3>
            <p style={{color: '#666', margin: '0 0 20px 0'}}>Please wait while we process your payment securely</p>
            <div style={{fontSize: '28px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 'bold'}}>{formatTime(processingTime)}</div>
          </div>
        </div>
      )}

      <div className='mainContent'>
        {/* Header */}
        <div className='header'>
          <h1 className='headerTitle'>Choose Your StormDrive Plan</h1>
          <p className='headerSubtitle'>Secure, flexible cloud storage that scales with your needs</p>
        </div>

        {/* Progress Indicator */}
        <div className='progressIndicator'>
          {[1, 2, 3, 4].map((step) => (
            <div key={step} style={{display: 'flex', alignItems: 'center'}}>
              <div className={`stepCircle ${currentStep >= step ? 'active' : 'inactive'}`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`stepArrow ${currentStep >= step ? 'active' : 'inactive'}`}>→</div>
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Pricing Selection */}
        {currentStep === 1 && (
          <div>
            {/* Billing Toggle */}
            <div className='billingToggle'>
              <div className='toggleContainer'>
                <button
                  onClick={() => setBillingCycle('monthly')}
                 className={billingCycle === 'monthly' ? 'toggleBtn active' : 'toggleBtn'}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={billingCycle === 'yearly' ? 'toggleBtn active' : 'toggleBtn'}
                >
                  Yearly 
                </button>
              </div>
            </div>

            {/* Pricing Model Toggle */}
            <div className="billingToggle billingToggle-margin-bottom">
              <div className='toggleContainer'>
                <button
                  onClick={() => {
                    setPricingModel('fixed');
                    setSelectedPlan('');
                  }}
                  className={pricingModel === 'fixed' ? 'toggleBtn active' : 'toggleBtn'}
                >
                  Fixed Plans
                </button>
                <button
                  onClick={() => {
                    setPricingModel('flexible');
                    setSelectedPlan('');
                  }}
                  className={pricingModel === 'flexible' ? 'toggleBtn active' : 'toggleBtn'}
                >
                  Flexible Pricing 
                </button>
              </div>
            </div>

            {/* Pricing Content */}
            <div className={`pricing-models ${pricingModel === 'fixed' ? 'three-column' : 'one-column'}`}>
              
              {/* Fixed Pricing */}
              {(pricingModel === 'fixed' || !pricingModel) && (
                <>
                  {Object.entries(fixedPlans).map(([key, plan]) => {
                    const isSelected = selectedPlan === key;
                    const isInteractive = pricingModel === 'fixed' || !pricingModel;
                    
                    return (
                      <div
                        key={key}
                        className={`fixed-plan-card 
                                    ${isSelected ? 'selected' : ''} 
                                    ${!isInteractive ? 'inactive' : ''}`}
                        onClick={() => {
                          if (isInteractive) {
                            setPricingModel('fixed');
                            setSelectedPlan(key);
                          }
                        }}
                      >
                        <h3 className="plan-title">{plan.name}</h3>
                        <p className="plan-description">{plan.description}</p>

                        <div className='plan-price-amount'>
                          ₹{plan[billingCycle].toLocaleString()}
                        </div>
                        <div className='plan-price-period'>
                          Per user/month, billed {billingCycle === 'yearly' ? 'annually' : 'monthly'}
                        </div>

                        <ul className='planFeaturesList'>
                          {plan.features.map((feature, idx) => (
                            <li key={idx} className='plan-feature-item'>
                              <span className='plan-feature-check'>✓</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <button
                           className={`plan-button ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInteractive) {
                              setPricingModel('fixed');
                              setSelectedPlan(key);
                            }
                          }}
                        >
                          {isSelected ? 'Selected' : plan.buttonText}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Flexible Pricing */}
              {(pricingModel === 'flexible' || !pricingModel) && pricingModel !== 'fixed' && (
                <div className={`flexible-pricing-card ${pricingModel === 'flexible' ? 'selected' : ''} ${pricingModel && pricingModel !== 'flexible' ? 'disabled' : ''}`}>
                  <h3 className='pricingCardTitle'>Flexible Pricing</h3>
                  <p style={{color: '#666', margin: '0 0 20px 0'}}>Pay only for what you need at ₹1.25 per GB</p>
                  
                  {(pricingModel === 'flexible' || !pricingModel) && (
                    <div className={`flexible-controls ${pricingModel !== 'flexible' ? 'disabled' : ''}`}>
                      <label style={{display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '10px', color:'var(--text-secondary)'}}>Storage Amount</label>
                      
                      <div className='gbInputContainer'>
                        <input
                          type="number"
                          min="20"
                          value={customGB}
                          onChange={(e) => {
                            if (pricingModel === 'flexible') {
                              const value = Math.max( parseInt(e.target.value) ); // Minimum 21, unlimited max
                              setCustomGB(value);
                            }
                          }}
                          className='gbInput'
                          placeholder="Enter GB"
                          disabled={pricingModel !== 'flexible'}
                        />
                        <span className='gbLabel'>GB</span>
                      </div>
                      
                      <div className='flexible-price'>
                        <div className='flexible-price-amount small'>₹{(customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</div>
                        <div style={{fontSize: '13px', color: 'var(--text-secondary)', margin: 0}}>/{billingCycle === 'yearly' ? 'year' : 'month'}</div>
                        <div style={{fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px'}}>₹1.25 per GB</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className='stepActions'>
              <div></div>
              <button
                onClick={() => setCurrentStep(2)}
                disabled={!pricingModel || (pricingModel === 'fixed' && !selectedPlan)}
                className={`Btn BtnPrimary ${(!pricingModel || (pricingModel === 'fixed' && !selectedPlan)) ? 'Btn-disabled' : ''}`}
              >
                Continue to Features →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Feature Selection - FIXED VERSION */}
        {/* {currentStep === 2 && (
          <div>
            <div style={{textAlign: 'center', marginBottom: '25px'}}>
              <h2 style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)', margin: '0 0 8px 0'}}>Enhance Your Experience</h2>
              <p style={{fontSize: '16px', color: 'var(--text-secondary)', margin: 0}}>Add optional features to customize your StormDrive experience</p>
            </div>

            <div style={{maxWidth: '800px', margin: '0 auto'}}>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px', columnCount:'2'}}>
                {features.map((feature) => {
                  const isSelected = selectedFeatures.includes(feature.id);
                  const isExpanded = expandedFeature === feature.id;
                  const price = feature.price * (billingCycle === 'yearly' ? 10 : 1);
                  
                  return (
                    <div key={feature.id} style={{width: '100%'}}>  */}
                      {/* Feature Card */}
                      {/* <div 
                        className={`feature-card ${feature.color} ${isSelected ? 'selected' : ''}`}
                        onClick={() => selectFeature(feature.id)}
                        style={{
                          borderRadius: '12px',
                          padding: '24px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          border: isSelected ? '2px solid var(--accent)' : '2px solid var(--border)',
                          background:'var(--file-bg)'
                        }}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <div style={{display: 'flex', alignItems: 'center', gap: '16px', flex: 1}}>
                            <span style={{fontSize: '32px'}}>{feature.icon}</span>
                            <div style={{flex: 1}}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <div>
                                  <h3 style={{fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 4px 0'}}>
                                    {feature.name}
                                  </h3>
                                  <p style={{fontSize: '16px', color: 'var(--text-secondary)', margin: 0, opacity: 0.9}}>
                                    {feature.description}
                                  </p>
                                </div>
                                
                                <div style={{textAlign: 'right', marginLeft: '24px'}}>
                                  <div style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--accent)'}}>
                                    +₹{price.toLocaleString()}
                                  </div>
                                  <div style={{fontSize: '14px', color: 'var(--text-secondary)', opacity: 0.8}}>
                                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{marginLeft: '20px'}}>  */}
                            {/* <button 
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpansion(feature.id);
                              }}
                            >
                              ▼
                            </button> */}
                           {/* </div>
                        </div>
                      </div>  */}
                      
                      {/* Expanded Details */}
                      {/* {isExpanded && (
                        <div style={{
                          background: 'var(--file-bg)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '12px',
                          padding: '24px',
                          marginTop: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                        }}>
                          <p style={{fontSize: '16px', color: 'var(--text-secondary)', margin: '0 0 24px 0', lineHeight: 1.6}}>
                            {feature.details}
                          </p>
                          
                          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px'}}>
                            {feature.benefits.map((benefit, idx) => (
                              <div key={idx} style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555'}}>
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: '#dcfce7',
                                  color: '#16a34a',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  flexShrink: 0
                                }}>
                                  ✓
                                </div>
                                <span>{benefit}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div style={{textAlign: 'center'}}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 16px',
                              borderRadius: '20px',
                              fontSize: '14px',
                              fontWeight: '500',
                              border: '1px solid #e5e7eb',
                              background: isSelected ? '#dcfce7' : '#f8fafc',
                              color: isSelected ? '#16a34a' : '#64748b'
                            }}>
                              {isSelected ? '✓ Added to your plan' : '+ Click above to add feature'}
                            </div>
                          </div>
                        </div>
                      )} */}
                    {/* </div>
                  );
                })}
              </div>
            </div>

            <div className='stepActions'>
              <button onClick={() => setCurrentStep(1)} className="Btn Btn-secondary">
                ← Back to Pricing
              </button>
              <button onClick={() => setCurrentStep(3)} className="Btn BtnPrimary">
                Continue to Payment →
              </button>
            </div>
          </div>
        )}  */}

        {currentStep === 2 && (
          <div className="enhanced-features-step">
            <div className="enhanced-header">
              <h2 className="enhanced-main-title">Enhance Your Experience</h2>
              <p className="enhanced-subtitle">Add optional features to customize your StormDrive experience</p>
            </div>

            <div className="enhanced-content">
              
              <div className="enhanced-features-list">
                {features.map((feature) => {
                  const isSelected = selectedFeatures.includes(feature.id);
                  const isExpanded = expandedFeature === feature.id;
                  
                  return (
                    <div key={feature.id} className="enhanced-feature-card">
                      <div
                        className={`enhanced-feature-header ${feature.color} ${isSelected ? 'price-selected' : ''} ${isExpanded ? 'enhanced-expanded-header' : ''}`}
                        onClick={() => selectFeature(feature.id)}
                      >
                        <div className="enhanced-feature-content">
                          <div className="enhanced-feature-left">
                            {/* <span className={`enhanced-feature-icon ${isExpanded ? 'enhanced-icon-expanded' : ''}`}>
                              {feature.icon}
                            </span> */}
                            <div className="enhanced-feature-info">
                              <div className="enhanced-feature-title-row">
                                <h3 className="enhanced-feature-title">{feature.name}</h3>
                                <div className={`price-selection-indicator ${isSelected ? 'price-indicator-selected' : ''}`}>
                                  {isSelected && (
                                    <svg className="enhanced-checkmark" fill="currentColor" viewBox="0 0 20 20">
                                      <path 
                                        fillRule="evenodd" 
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                                        clipRule="evenodd" 
                                      />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <p className="enhanced-feature-description">{feature.description}</p>
                            </div>
                          </div>
                          <div className="enhanced-feature-right">
                            <div className="enhanced-price-info">
                              <div className="enhanced-price">
                                +₹{(feature.price * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}
                              </div>
                              <div className="enhanced-billing-period">
                                /{billingCycle === 'yearly' ? 'year' : 'month'}
                              </div>
                            </div>
                            <button 
                              className={`enhanced-expand-button ${isExpanded ? 'enhanced-button-expanded' : ''}`}
                              title="Learn more"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpansion(feature.id);
                              }}
                            >
                              <svg className="enhanced-expand-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      
                      </div>
                      
                      <div className={`enhanced-feature-details ${isExpanded ? 'enhanced-details-expanded' : ''}`}>
                        <div className="enhanced-details-content">
                          <p className={`enhanced-detailed-description ${isExpanded ? 'enhanced-description-visible' : ''}`}>
                            {feature.detailedDescription}
                          </p>
                          
                          <div className={`enhanced-benefits-grid ${isExpanded ? 'enhanced-benefits-visible' : ''}`}>
                            {feature.benefits.map((benefit, idx) => (
                              <div 
                                key={idx} 
                                className={`enhanced-benefit-item ${isExpanded ? 'enhanced-benefit-visible' : ''}`}
                                style={{ 
                                  transitionDelay: isExpanded ? `${300 + idx * 50}ms` : '0ms',
                                  animationDelay: isExpanded ? `${300 + idx * 50}ms` : '0ms'
                                }}
                              >
                                <span className="enhanced-benefit-check">✓</span>
                                <span className="enhanced-benefit-text">{benefit}</span>
                              </div>
                            ))}
                          </div>
                          
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='stepActions'>
              <button onClick={() => setCurrentStep(1)} className="Btn Btn-secondary">
                ← Back to Pricing
              </button>
              <button onClick={() => setCurrentStep(3)} className="Btn BtnPrimary">
                Continue to Payment →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Payment Summary */}
        {currentStep === 3 && (
          <div>
            <div style={{textAlign: 'center', marginBottom: '25px'}}>
              <h2 style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0'}}>Payment Summary</h2>
              <p style={{fontSize: '16px', color: 'var(--text-secondary)', margin: 0}}>Review your order before completing the purchase</p>
            </div>

            <div className='order-details'>
              <h3 style={{fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', margin: '0 0 20px 0'}}>Order Details</h3>
              
              <div style={{marginBottom: '20px'}}>
                {pricingModel === 'fixed' && selectedPlan && (
                  <div className='orderItem'>
                    <div>
                      <div className='itemName'>{fixedPlans[selectedPlan].name} Plan</div>
                      <div className='itemDetails'>{fixedPlans[selectedPlan].storage} • {billingCycle}</div>
                    </div>
                    <div className='itemPrice'>₹{fixedPlans[selectedPlan][billingCycle].toLocaleString()}</div>
                  </div>
                )}
                
                {pricingModel === 'flexible' && (
                  <div className='orderItem'>
                    <div>
                      <div className='itemName'>Flexible Storage</div>
                      <div className='itemDetails'>{customGB} GB • {billingCycle}</div>
                    </div>
                    <div className='itemPrice'>₹{(customGB * 1.25 * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</div>
                  </div>
                )}
                
                {selectedFeatures.map(featureId => {
                  const feature = features.find(f => f.id === featureId);
                  return (
                    <div key={featureId} className='orderItem'>
                      <div>
                        <div className='itemName'>{feature.name}</div>
                        <div className='itemDetails'>{billingCycle}</div>
                      </div>
                      <div className='itemPrice'>₹{(feature.price * (billingCycle === 'yearly' ? 10 : 1)).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              <div className='orderTotal'>
                <div className='totalRow'>
                  <span style={{ color : 'var(--text-primary)'}}>Total</span>
                  <span style={{ color : 'var(--text-primary)'}}>₹{calculateTotal().toLocaleString()}</span>
                </div>
                <div className='totalPeriod'>{billingCycle === 'yearly' ? 'per year' : 'per month'}</div>
              </div>
            </div>


            <div className='stepActions'>
              <button onClick={() => setCurrentStep(2)} className="Btn Btn-secondary">
                ← Back to Features
              </button>
              <button onClick={() => setCurrentStep(4)} className="Btn Btn-success">
                Choose Payment Method →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Payment Method */}
        {currentStep === 4 && (
          <div>
            <div style={{textAlign: 'center', marginBottom: '32px'}}>
              <h2 style={{fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0'}}>
                Payment Method
              </h2>
              <p style={{fontSize: '16px', color: 'var(--text-secondary)', margin: 0}}>
                Choose your preferred payment method to complete your purchase
              </p>
            </div>

            <div style={{maxWidth: '800px', margin: '0 auto'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '16px'}}>
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id)}
                    style={{
                      border: selectedPaymentMethod === method.id ? '2px solid var(--accent)' : '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: selectedPaymentMethod === method.id ? 'var(--file-bg)' : 'var(--file-bg)',
                      position: 'relative'
                    }}
                  >
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                        {/* <span style={{fontSize: '24px'}}>{method.icon}</span> */}
                        <div>
                          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                            <h3 style={{fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', margin: 0}}>
                              {method.name}
                            </h3>
                          </div>
                          <p style={{fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0'}}>
                            {method.description}
                          </p>
                          {/* <div style={{display: 'flex', gap: '16px', fontSize: '12px', color: '#888'}}>
                            <span>⏱️ {method.processingTime}</span>
                            <span>💰 {method.fees}</span>
                          </div> */}
                        </div>
                      </div>
                      
                      {/* <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: selectedPaymentMethod === method.id ? '6px solid #3b82f6' : '2px solid #d1d5db',
                        background: selectedPaymentMethod === method.id ? 'var(--file-bg)' : 'var(--file-bg)'
                      }} /> */}
                    </div>
                  </div>
                ))}
              </div>

              {selectedPaymentMethod && renderPaymentForm()}
            </div>

            <div className='stepActions'>
              <button onClick={() => setCurrentStep(3)} className="Btn Btn-secondary">
                ← Back to Summary
              </button>
              {selectedPaymentMethod && (
                <button onClick={handlePayment} className="Btn BtnPrimary">
                  Complete Payment →
                </button>
              )}
            </div>
          </div>
        )}
        </div>
    </div>
  );
};

export default Pricing;