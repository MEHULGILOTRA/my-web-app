import React, { useState } from "react";
import "./ContactUs.css";
import { sendEmail } from "./emailService";

function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleSendEmail = async () => {

    await sendEmail(
      name,
      email,
      message,
      "send-email"
  );
    await sendEmail(
      name,
      email,
      message,
      "send-email-user",
  );
};


  return (
    <section className="contact-us">
      <h2>Contact Us</h2>
      <form onSubmit={handleSendEmail}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your Email"
          required
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your Enquiry"
          rows="5"
          required
        ></textarea>
        <button type="submit" className="button">Send Message</button>
      </form>
    </section>
  );
}

export default ContactUs;
