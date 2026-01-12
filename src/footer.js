import React from 'react';
import './footer.css';
import social_icons from './datasources/social-icons';
function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <p>&copy; 2025 Skymiles Travel. All rights reserved.</p>
          <div className="social-icons">
                {social_icons.map((item, index) => (
                  <div key={index}>
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      <img src={item.src} alt={item.link} className="social-icon"/>
                    </a>
                  </div>
                ))}
        </div>
        {/* <div className="footer-links">
          <a href="#about-us">About Us</a>
          <a href="#contact">Contact</a>
          <a href="#terms">Terms & Conditions</a>
        </div> */}
      </div>
      <a href="mailto:skymilestravels1@gmail.com" className="email">
        skymilestravels1@gmail.com
      </a>
      <div className="footer-bottom">
        <p>Luxury travel, crafted for you.</p>
      </div>
    </footer>
  );
}

export default Footer;
