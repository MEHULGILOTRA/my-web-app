import React from 'react';
import './OurTeam.css';
import profile from './images/profile.jpeg'; // Adjust the path based on where the image is located

function OurTeam() {
  return (
    <section className="our-team">
      <h2>Meet Our Team</h2>
      <div className="team-cards">
        <div className="team-member">
          <img src={profile} alt="" />
          <h3>Pranjul Gilotra</h3>
          <p>CEO</p>
        </div>
      </div>
    </section>
  );
}

export default OurTeam;
