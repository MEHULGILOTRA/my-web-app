// Frontend Email Service using EmailJS
// Simplified to use ONE template for both admin and user emails

import emailjs from '@emailjs/browser';

// EmailJS Configuration - Hardcoded credentials
const EMAILJS_SERVICE_ID = 'service_f2n9yt8';
const EMAILJS_TEMPLATE_ID = 'template_8rz3ful';
const EMAILJS_PUBLIC_KEY = '6gkv6Ukc5A346CG9z';

// Initialize EmailJS with public key
emailjs.init(EMAILJS_PUBLIC_KEY);

/**
 * Send contact form emails to both admin and user
 * Uses same template with different content for each email
 * @param {string} name - Sender's name
 * @param {string} email - Sender's email
 * @param {string} message - Message content
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendContactFormEmails = async (name, email, message) => {
  try {
    // Email 1: Send to admin (singapore.skymilestravels@gmail.com)
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: 'singapore.skymilestravels@gmail.com',
        email_subject: `New Contact Form Submission from ${name}`,
        email_body: `User has submitted a query:

Name: ${name}
Email: ${email}

Message:
${message}

---
This email was sent from the SkyMiles Travel website contact form.`
      }
    );

    // Email 2: Send confirmation to user
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: email,
        email_subject: "We've Received Your Query - SkyMiles Travel",
        email_body: `Hi ${name},

Your details have been noted:

Name: ${name}
Email: ${email}
Message: ${message}

Our team will get back to you shortly.

Best regards,
SkyMiles Travel Team`
      }
    );

    return { success: true, message: 'Emails sent successfully!' };
  } catch (error) {
    console.error('Failed to send emails:', error);
    return { success: false, message: 'Failed to send emails. Please try again.' };
  }
};

// Keep old function names for backward compatibility (deprecated)
export const sendEmailToAdmin = async (name, email, message) => {
  console.warn('sendEmailToAdmin is deprecated. Use sendContactFormEmails instead.');
  return sendContactFormEmails(name, email, message);
};

export const sendConfirmationToUser = async (name, email) => {
  console.warn('sendConfirmationToUser is deprecated. Use sendContactFormEmails instead.');
  return { success: true };
};
