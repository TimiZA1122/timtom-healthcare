require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Booking = require('./models/Booking');
const User = require('./models/User');
const path = require('path');

const app = express();
const PORT = 3000;

//  Middleware
app.use(express.json());
app.use(cors());

// Default Route to Avoid "Cannot GET /"
app.get('/', (req, res) => {
    res.send(" TimTom Backend is Running!");
});

//  MongoDB Connection
console.log(" MongoDB URI:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(" Connected to MongoDB successfully!"))
    .catch(err => console.error(" MongoDB connection failed:", err));

//  Set Up OAuth2 for Gmail
const OAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground" // This must match your redirect URI
);
OAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

//  Email Transporter
async function createTransporter() {
    const accessToken = await OAuth2Client.getAccessToken();
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            type: "OAuth2",
            user: process.env.EMAIL_USER,
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            refreshToken: process.env.REFRESH_TOKEN,
            accessToken: accessToken.token
        }
    });
}

//  Send Booking Confirmation Email to User
async function sendConfirmationEmail(email, client_name, date, time, service) {
    const transporter = await createTransporter();
    await transporter.sendMail({
        from: `"TimTom Healthcare" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Appointment Confirmation - TimTom Healthcare",
        html: `
            <p>Dear <strong>${client_name}</strong>,</p>
            <p>We are pleased to confirm your appointment with <strong>TimTom Healthcare</strong>. Please find the details of your appointment below:</p>

            <h3>Appointment Details:</h3>
            <ul>
                <li><strong>Client Name:</strong> ${client_name}</li>
                <li><strong>Date & Time:</strong> ${date}, ${time}</li>
                <li><strong>Service:</strong> ${service}</li>
            </ul>

            <p>If you need to reschedule or have any questions, please contact us at <strong>647-739-7718</strong> or reply to this email.</p>

            <h3>Supervisor Information:</h3>
            <p>
                <strong>Janet Akindele</strong><br>
                Registered Nurse<br>
                TimTom Healthcare<br>
                📞 647-739-7718<br>
                ✉ <a href="mailto:Janetimmy3@yahoo.com">Janetimmy3@yahoo.com</a>
            </p>

            <p>We appreciate your trust in TimTom Healthcare and look forward to serving you.</p>

            <p>Best regards,</p>
            <p><strong>TimTom Healthcare Support Team</strong><br>
            TimTom Healthcare<br>
             647-739-7718 | ✉ <a href="mailto:TimTomhealthcare@gmail.com">TimTomhealthcare@gmail.com</a><br>
             <a href="http://www.TimTomHealthcare.com">www.TimTomHealthcare.com</a></p>
        `,
        attachments: [
            {
                filename: 'TimTomLogo copy.jpg', // Updated filename
                path: path.join(__dirname, 'TimTomLogo copy.jpg'),
                cid: 'logo@timtomhealthcare'
            }
        ]
    });
}


//  Send Notification Email to Admin
async function sendAdminNotification(client_name, email, phone, date, time, assistance) {
    try {
        const transporter = await createTransporter();
        await transporter.sendMail({
            from: `"TimTom Healthcare" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL, // Ensure this is set in your .env
            subject: " New Booking Alert - TimTom Healthcare",
            text: `
📌 A new booking has been made!

 Client Name: ${client_name}
 Email: ${email}
 Phone: ${phone}  
 Date: ${date}
 Time: ${time}
 Service: ${assistance}  

 Check MongoDB for more details.

 Please follow up with the client if necessary.
            `
        });
        console.log(` Admin notified of new booking (Now correctly formatted)`);
    } catch (error) {
        console.error(" Admin email notification failed:", error);
    }
}




//  Booking API Endpoint
app.post('/book', async (req, res) => {
    try {
        console.log(" Booking request received:", req.body);

        // Extract data correctly
        const { client_name, email, phone, date, time, assistance } = req.body;

        //  Ensure all fields are provided
        if (!client_name || !email || !phone || !date || !time || !assistance) {
            console.error(" Missing fields:", req.body);
            return res.status(400).json({ message: " Missing required fields!" });
        }

        //  Create new booking entry
        const newBooking = new Booking({ client_name, email, phone, date, time, assistance });
        await newBooking.save();

        // Send confirmation email to the client
        await sendConfirmationEmail(email, client_name, date, time, assistance);

        //  Send notification email to the admin ( Correct order)
        await sendAdminNotification(client_name, email, phone, date, time, assistance);

        console.log(" Booking saved successfully!", newBooking);
        res.json({ message: " Booking saved successfully!", booking: newBooking });

    } catch (error) {
        console.error(" Error saving booking:", error);
        res.status(500).json({ message: " Database error", error });
    }
});





//  Authentication Middleware
const authenticateUser = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token.split(" ")[1], process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden' });
        req.user = user;
        next();
    });
};

//  Get all bookings (Protected Route)
app.get('/admin/bookings', authenticateUser, async (req, res) => {
    try {
        const bookings = await Booking.find();
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: "Database error" });
    }
});

//  User Authentication (Login System)
app.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.json({ message: " User registered successfully!" });
    } catch (error) {
        res.status(500).json({ message: " Error registering user" });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: " Invalid credentials" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: " Error logging in" });
    }
});

//  Start Server
app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT}`);
});
