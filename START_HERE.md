# 🚀 SkyMiles Travel - Quick Start Guide

## ⚡ Start the Application

```bash
cd /Users/mehulgilotra/Desktop/Skymiles/my-web-app
npm start
```

The app will open automatically at **http://localhost:3000**

---

## 📧 Complete Email Setup

You've already created the EmailJS template! Now just:

### 1. Get Your Template ID
- Go to https://dashboard.emailjs.com/
- Click "Email Templates"
- Find your template
- Copy the **Template ID** (looks like `template_abc123`)

### 2. Update .env File
Open `.env` and replace this line:
```
REACT_APP_EMAILJS_TEMPLATE_ID=your_template_id_here
```

With your actual template ID:
```
REACT_APP_EMAILJS_TEMPLATE_ID=template_abc123
```

### 3. Restart the Server
```bash
# Press Ctrl+C to stop
# Then restart:
npm start
```

---

## ✅ Test the Email System

### Test Contact Form:
1. Click "Contact Us" in navigation
2. Fill in: Name, Email, Message
3. Click "Send Message"
4. **Check 2 emails**:
   - `singapore.skymilestravels@gmail.com` - Your notification
   - User's email - Confirmation message

### Test Chatbot:
1. Click purple chat button (bottom right)
2. Answer all 16 questions
3. Click "Submit My Requirements"
4. **Check 2 emails** (same as above)

---

## 🎨 What's New

✨ **Enhanced Features:**
- Modern purple chatbot with progress bar
- Back button in chatbot
- Validation for email/phone
- Smooth animations throughout
- Contact form integrated in main page
- Lazy loading for faster performance
- All fonts standardized to Roboto

🎯 **Email System:**
- Uses ONE template for both emails
- Admin email: singapore.skymilestravels@gmail.com
- User gets confirmation automatically
- No backend needed - all frontend!

---

## 🐛 Troubleshooting

**Emails not sending?**
- Check `.env` has correct Template ID
- Restart server after changing `.env`
- Check browser console (F12) for errors
- Verify template in EmailJS dashboard

**Port 3000 in use?**
```bash
lsof -ti:3000 | xargs kill -9
npm start
```

---

## 📝 Your Configuration

✅ Service ID: `service_f2n9yt8`
✅ Public Key: `6gkv6Ukc5A346CG9z`
⏳ Template ID: Add to `.env` file

Admin Email: `singapore.skymilestravels@gmail.com`

---

Need help? Check the browser console or contact support!
