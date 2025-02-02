import React from 'react';
import './header.css';
import logo from './images/skymile-logo.png';

function Header() {
  return (
    <header>
      <div className="header-content">
      <h1 style={{ display: 'flex', alignItems: 'center' }}>
      Skymiles Travel
            <img
                src={logo} 
                alt="SkyMiles Logo" 
                style={{ height: '150px', marginLeft: '5px' }} // Adjust height as needed
                />
            </h1>
        <p>Experience the elegance of luxury travel</p>
        <a href="#discover" className="header-btn">
          Start Your Journey
        </a>
      </div>
    </header>
  );
}

export default Header;
