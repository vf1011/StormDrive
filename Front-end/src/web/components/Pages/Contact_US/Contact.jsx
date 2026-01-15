// import React, { useState } from 'react';
// import './Contact.css';

// const ContactUs = () => {
//   const [formData, setFormData] = useState({
//     name: '',
//     email: '',
//     industry: '',
//     message: ''
//   });

//   const handleChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value
//     });
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log('Form submitted:', formData);
//     alert('Message sent successfully!');
    
//     // Reset form after submission
//     setFormData({
//       name: '',
//       email: '',
//       industry: '',
//       message: ''
//     });
//   };

//   const options = [
//    'General Inquiry',
//    'Cloud Storage Consultation',
//    'Pricing & Plans',
//    'Technical Support',
//    'Partnership & Collaboration',
//    'Other',
//   ];

//   return (
//     <div className="contact-container">
//       <div className="contact-card">
        
//         {/* Left Section - Content */}
//         <div className="content-section">
//           <div className="subtitle">
//             WE'RE HERE TO HELP YOU
//           </div>
          
//           <h1 className="main-title">
//            Unlock Your Cloud’s True Potential 
//           </h1>
          
//           <p className="description">
//             Whether you need personal storage, team collaboration tools, or enterprise-grade security, StormDrive is here to help you.
//             Start a conversation with us today.
//           </p>
          
//           {/* Contact Info */}
//           <div className="contact-info">
//             <div className="contact-item">
//               <div className="contact-icon">
//                 <span className='mail'>✉️</span>
//               </div>
//               <div className="contact-details">
//                 {/* <div className="contact-label">E-mail</div> */}
//                 <div className="contact-value">stomdrive.ad@gmail.com</div>
//               </div>
//             </div>
            
//             <div className="contact-item">
//               <div className="contact-icon">
//                 <span>📞</span>
//               </div>
//               <div className="contact-details">
//                 {/* <div className="contact-label">Phone number</div> */}
//                 <div className="contact-value">+91 93165 *****</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Right Section - Form */}
//         <div className="form-section">
//           <form onSubmit={handleSubmit} className="contact-form">
//             <div className="form-group">
//               <label className="form-label">Name</label>
//               <input
//                 type="text"
//                 name="name"
//                 placeholder="Name"
//                 value={formData.name}
//                 onChange={handleChange}
//                 className="form-input"
//                 required
//               />
//             </div>

//             <div className="form-group">
//               <label className="form-label">Email</label>
//               <input
//                 type="email"
//                 name="email"
//                 placeholder="Email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 className="form-input"
//                 required
//               />
//             </div>

//             <div className="form-group">
//               <label className="form-label">How Can We Help You? </label>
//               <select
//                 name="options"
//                 value={formData.options}
//                 onChange={handleChange}
//                 className="form-select"
//                 required
//               >
//                 {options.map((industry, index) => (
//                   <option key={index} value={industry} disabled={industry === 'Select'}>
//                     {industry}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="form-group">
//               <label className="form-label">Message</label>
//               <textarea
//                 name="message"
//                 placeholder="Tell us what you need, we’ll get back to you shortly..."
//                 value={formData.message}
//                 onChange={handleChange}
//                 rows="6"
//                 className="form-textarea"
//                 required
//               />
//             </div>

//             <button type="submit" className="submit-button">
//               <span className="button-icon">→</span>
//               Get a Solution
//             </button>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ContactUs;


import React, { useState } from 'react';
import './Contact.css';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    industry: '',
    message: ''
  });

  const [isSliding, setIsSliding] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [showtext, setShowText] = useState(true)

  const isFormValid = formData.name && formData.email && formData.industry && formData.message;


  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);

    // Start animation
    setIsSliding(true);

    // Show dialog after animation completes (500ms)
    setTimeout(() => {
      setDialogVisible(true);

      // Reset form
      setFormData({
        name: '',
        email: '',
        industry: '',
        message: ''
      });
    }, 500);
  };

const closeDialog = () => {
    setDialogVisible(false);

    // Slide arrow back
    setIsSliding(false);

    // Show text after the arrow has slid back
    setTimeout(() => {
      setShowText(true);
    }, 500);
  };

  const options = [
    'General Inquiry',
    'Cloud Storage Consultation',
    'Pricing & Plans',
    'Technical Support',
    'Partnership & Collaboration',
    'Other',
  ];

  return (
    <div className="contact-page contact-container">
      <div className="contact-card">

        {/* Left Section */}
        <div className="content-section">
          <div className="subtitle">
            WE'RE HERE TO HELP YOU
          </div>
          <h1 className="main-title">
            Unlock Your Cloud’s True Potential
          </h1>
          <p className="description">
            Whether you need personal storage, team collaboration tools, or enterprise-grade security, StormDrive is here to help you.
            Start a conversation with us today.
          </p>

          {/* Contact Info */}
          <div className="contact-info">
            <div className="contact-item">
              <div className="contact-icon">
                <span className='mail'>✉️</span>
              </div>
              <div className="contact-details">
                <div className="contact-value">stomdrive.ad@gmail.com</div>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-icon">
                <span>📞</span>
              </div>
              <div className="contact-details">
                <div className="contact-value">+91 93165 *****</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Form */}
        <div className="form-section">
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">How Can We Help You? </label>
              <select
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="" disabled>Select</option>
                {options.map((industry, index) => (
                  <option key={index} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea
                name="message"
                placeholder="Tell us what you need, we’ll get back to you shortly..."
                value={formData.message}
                onChange={handleChange}
                rows="6"
                className="form-textarea"
                required
              />
            </div>

            <button type="submit" 
                    className={`contact-submit-button ${isSliding ? 'sliding' : ''}`} 
                    onClick={handleSubmit}
                    disabled={!isFormValid}
            style={{ opacity: isFormValid ? 1 : 0.6, cursor: isFormValid ? 'pointer' : 'not-allowed' }}>
               <span className={`button-icon ${isSliding ? 'arrow-slide' : ''}`}>→</span>
               <span className={`button-text ${isSliding ? 'text-out' : ''}`}>Get a Solution</span>
            </button>
          </form>
        </div>
      </div>

      {/* Dialog */}
     {dialogVisible && (
  <div className="dialog-backdrop" onClick={closeDialog}>
    <div className="success-dialog" onClick={(e) => e.stopPropagation()}>
      <div className="checkmark-box">
        <span className="tick">✔️</span>
      </div>
      <h2 className="thank-you">THANK YOU!</h2>
      <p className="order-message">Your message has been sent successfully.</p>
      <p className="order-subtext">We will get back to you shortly via your email.</p>
      <button className="close-dialog" onClick={closeDialog}>Close</button>
    </div>
  </div>
)}


    </div>
  );
};

export default ContactUs;
