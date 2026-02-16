// import React, { useState } from "react";
import React from "react";
import "./AboutUs.css";
// import profile from './images/profile.jpeg'; // Adjust the path based on where the image is located
import icons from './datasources/icons';

function AboutUs() {
  return (
    <section className="about-us">
      <h2>About SkyMiles Travels</h2>
      <p>
        SkyMiles Travels is a trusted provider of customized travel solutions, offering comprehensive holiday packages to destinations worldwide. We specialize in flights, hotel accommodations, sightseeing tours, visa assistance, and seamless travel experiences tailored to your preferences. Our expertise ensures a hassle-free journey, whether for leisure or business travel.
      </p>
      <h3>Our Services Include:</h3>
      <div className="services-cards">
        {icons.map((item, index) => (
          <div key={index} className="service-card">
            <img src={item.src} alt={item.description} className="service-icon" />
            <h4>{item.description}</h4>
          </div>
        ))}
      </div>

    </section>
  );
}

export default AboutUs;
