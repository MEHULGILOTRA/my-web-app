import React from 'react';
import './header.css';
import logo from './images/skymile-logo.png';
import { HashLink } from 'react-router-hash-link';

function Header() {
  return (
    <header className="header-container">
      <div className="header-top">
        <div className="header-left">
          <img src={logo} alt="SkyMiles Logo" class="logo" />
          <h1 className="header-title">Skymiles Travel</h1>
        </div>
        <div className="header-right">
          <nav>
            <ul className="nav-list">
              <li className = "li-items"><HashLink to="#landingpage" smooth className="li-items" >Home</HashLink></li>
              <li className = "li-items"><HashLink to="#destinations" smooth className="li-items">Destinations</HashLink></li>
              {/* <li className = "li-items"><HashLink to="#packages" smooth className="li-items">Exclusive Packages</HashLink></li>
              <li className = "li-items"><HashLink to="#testimonials" smooth className="li-items">Testimonials</HashLink></li>
              <li className = "li-items"><HashLink to="#team" smooth className="li-items">Our Team</HashLink></li> */}
              <li className = "li-items"><HashLink to="#contact" smooth className="li-items">Contact Us</HashLink></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
