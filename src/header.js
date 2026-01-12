import React from 'react';
import './header.css';
import logo from './images/skymile-logo.png';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="header-container">
      <div className="header-top">
        <div className="header-left">
          <Link to="/#landingpage">
          <img src={logo} alt="SkyMiles Logo" className="logo" />
          </Link>
          <h1 className="header-title">SkyMiles Travel</h1>
        </div>
        <div className="header-right">
          <nav>
            <ul className="nav-list">
              <li className="li-items">
                <Link to="/#landingpage" className="li-items">
                  Home
                </Link>
              </li>
              <li className="li-items">
                <Link to="/#destinations" className="li-items">
                  Destinations
                </Link>
              </li>
              <li className="li-items">
                <Link to="/search-results?destination=" className="li-items">
                  Packages
                </Link>
                </li>
              {/* <li className="li-items">
                <Link to="/#contact" className="li-items">
                  Contact Us
                </Link>
              </li> */}
              <li className="li-items">
                <Link to="/#about-us" className="li-items">
                  About Us
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Header;
