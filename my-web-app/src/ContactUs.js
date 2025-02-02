import React, { useState } from 'react';
import './ContactUs.css';

function ContactUs() {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Message Sent!');
  };

  return (
    <section className="contact-us">
      <h2>Contact Us</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here"
          rows="5"
        ></textarea>
        <button type="submit" className="button">Send Message</button>
      </form>
    </section>
  );
}

export default ContactUs;
