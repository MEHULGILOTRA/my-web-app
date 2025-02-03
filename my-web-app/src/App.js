import React from 'react';
import './App.css';
import Header from './header';
import Footer from './footer';
import DestinationHighlights from './DestinationHighlights';
import ExclusivePackages from './ExclusivePackages';
import Testimonials from './Testimonials';
import OurTeam from './OurTeam';
import ContactUs from './ContactUs';
import GoToTopButton from './GoToTopButton';

function App() {
  return (
    <div className="App">
      <Header />
      <main className="main-content">
        <section id="home" className="section">
          <h2>Your Dream Vacation Awaits</h2>
          <p>Explore the world's most luxurious destinations with us.</p>
          <div>
            <button className="button">Discover More</button>
          </div>
        </section>

        <section id="destinations" className="section">
          <DestinationHighlights />
        </section>

        <section id="packages" className="section">
          <ExclusivePackages />
        </section>

        <section id="testimonials" className="section">
          <Testimonials />
        </section>

        <section id="team" className="section">
          <OurTeam />
        </section>

        <section id="contact" className="section">
          <ContactUs />
        </section>

        <section className="section">
          <h2>Why Choose Us?</h2>
          <p>Experience the finest services, hand-picked tours, and expert guides.</p>
          <button className="button">Learn More</button>
        </section>
      </main>
      <Footer />
      <GoToTopButton />

    </div>
  );
}

export default App;
