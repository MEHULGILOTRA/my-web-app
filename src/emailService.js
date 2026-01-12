// emailService.js

export const sendEmail = async (name, email, message, endpoint) => {
    const emailData = { name, email, message };
  
    try {
      const response = await fetch(`http://localhost:5001/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
  
      const data = await response.json();
      console.log("Email sent successfully:", data);
      alert("Email sent successfully!");
      return true;
    } catch (error) {
      console.error("Email sending failed:", error);
      alert("Failed to send email. Please try again.");
      return false;
    }
  };
  