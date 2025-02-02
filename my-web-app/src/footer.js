import React from 'react';
import './footer.css';

function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <p>&copy; 2024 Skymiles Travel. All rights reserved.</p>
        <div className="social-icons">
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-facebook"></i>
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <i className="fab fa-twitter"></i>
          </a>
        </div>
        <div className="footer-links">
          <a href="#about-us">About Us</a>
          <a href="#contact">Contact</a>
          <a href="#terms">Terms & Conditions</a>
        </div>
      </div>
      <div className="footer-bottom">
        <p>Luxury travel, crafted for you.</p>
      </div>
    </footer>
  );
}

export default Footer;
