import React, { useState } from "react";
import "./ContactUs.css";

function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const sendEmail = () => {
    const emailData = { name, email, message };

    fetch("http://localhost:5001/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Success:", data);
        alert("Email sent successfully!");
        setName(""); // Clear fields after sending
        setEmail("");
        setMessage("");
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to send email.");
      });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendEmail();
  };

  return (
    <section className="contact-us">
      <h2>Contact Us</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name"
          required
        />
        <textarea
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
