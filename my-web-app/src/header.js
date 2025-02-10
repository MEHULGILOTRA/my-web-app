import React from 'react';
import './header.css';
import logo from './images/skymile-logo.png';
import { HashLink } from 'react-router-hash-link'; // Use HashLink instead

function Header() {
  return (
    <header>
      <div>
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
          <HashLink to="#landingpage" smooth className="li-items">
            Start Your Journey
            </HashLink>
          </a>
        </div>
        <div className='header-nav'>
          <nav className="nav">
            <ul className="nav-list">
              <li><HashLink to="#home" smooth className="li-items">Home</HashLink></li>
              <li><HashLink to="#destinations" smooth className="li-items">Destinations</HashLink></li>
              <li><HashLink to="#packages" smooth className="li-items">Exclusive Packages</HashLink></li>
              <li><HashLink to="#testimonials" smooth className="li-items">Testimonials</HashLink></li>
              <li><HashLink to="#team" smooth className="li-items">Our Team</HashLink></li>
              <li><HashLink to="#contact" smooth className="li-items">Contact Us</HashLink></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
