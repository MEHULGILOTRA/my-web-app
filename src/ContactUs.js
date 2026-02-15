import React, { useState } from "react";
import "./ContactUs.css";
import { sendContactFormEmails } from "./emailServiceClient";

function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage("");

    try {
      const result = await sendContactFormEmails(name, email, message);

      if (result.success) {
        setStatusMessage('Message sent successfully! Check your email for confirmation.');
        setName('');
        setEmail('');
        setMessage('');
      } else {
        setStatusMessage(result.message || 'Failed to send message. Please check your EmailJS configuration.');
      }
    } catch (error) {
      setStatusMessage('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="contact-us">
      <h2 className="section-title">Contact Us</h2>
      <p className="contact-intro">Have questions? We'd love to hear from you!</p>

      <form onSubmit={handleSendEmail} className="contact-form">
        {statusMessage && (
          <div className={`form-message ${statusMessage.includes('success') ? 'success' : 'error'}`}>
            {statusMessage}
          </div>
        )}

        <input
          type="text"
          className="form-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
          disabled={isLoading}
        />

        <input
          type="email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          required
          disabled={isLoading}
        />

        <textarea
          className="form-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your Enquiry"
          rows="5"
          required
          disabled={isLoading}
        ></textarea>

        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </section>
  );
}

export default ContactUs;
