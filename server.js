console.log("step 1");
require('dotenv').config();

const crypto = require('crypto');
const nodemailer = require('nodemailer');

console.log("step 2");
const url = process.env.MONGODB_URI;
console.log('MONGODB_URI:', process.env.MONGODB_URI);
if (!url) {
  console.error("MONGODB_URI is not defined in environment!");
  process.exit(1); //stop immediately
}

console.log("step 3");
const connectDB = require('./db');

console.log("step 4");
const express = require('express');

console.log("step 5");
const cors = require('cors');
const { connect } = require('node:http2');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,     //gmail address
    pass: process.env.EMAIL_PASSWORD  //gmail app password
  }
});

app.use((req, res, next) => 
{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS'
  );
  next();
});

app.post('/api/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ id: -1, firstName: '', lastName: '', error: 'All fields are required' });
  }

  try {
    const db = await connectDB();

    const user = await db.collection('users').findOne({ login: login, password: password });

    if (!user) {
      return res.status(200).json({ id: -1, firstName: '', lastName: '', error: 'Invalid username or password' });
    }

    res.status(200).json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      error: ''
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ id: -1, firstName: '', lastName: '', error: 'Server error' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { firstName, lastName, login, password } = req.body;

  if (!firstName || !lastName || !login || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const db = await connectDB();

    // check if username already exists
    const existingUser = await db.collection('users').findOne({ login: login });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    //generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); //24 hours
    
    // create new user
    const newUser = {
      firstName: firstName,
      lastName: lastName,
      login: login,
      password: password,
      createdAt: new Date(),
      trips: [],
      is_verified: false,
      verification_token: verificationToken,
      token_expires_at: tokenExpiry
    };

    const result = await db.collection('users').insertOne(newUser);

    const verifyLink = `https://landmarkmerncop4331.online/verify-email?token=${verificationToken}`;

    await transporter.sendMail({
      from: `"Your App Name" <${process.env.EMAIL_USER}>`,
      to: login, // assumes login is an email address
      subject: 'Verify your email',
      html: `
        <h2>Welcome, ${firstName}!</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${verifyLink}" style="
          background:#3b82f6;
          color:white;
          padding:12px 24px;
          border-radius:6px;
          text-decoration:none;
          display:inline-block;
        ">Verify Email</a>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, ignore this email.</p>
      `
    });
    
    res.status(200).json({
      error: '',
      id: result.insertedId
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// API Route for User Data
const { ObjectId } = require('mongodb');

app.get('/api/users/:userId/trips', async (req, res) => {
  try {
    const db = await connectDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.userId) },
      { projection: { trips: 1 } }
    );
    res.json({ error: '', trips: user?.trips || [] });
  } catch (err) {
    res.status(500).json({ error: 'Server error', trips: [] });
  }
});

app.put('/api/users/:userId/trips', async (req, res) => {
  try {
    const { trips } = req.body;
    if (!Array.isArray(trips)) return res.status(400).json({ error: 'trips must be array' });

    const db = await connectDB();
    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.userId) },
      { $set: { trips, updatedAt: new Date() } }
    );
    res.json({ error: '' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

const crypto = require('crypto');

app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required.' });
  }

  try {
    const db = await connectDB();

    const user = await db.collection('users').findOne({
      verification_token: token,
      is_verified: { $ne: true }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or already used verification token.' });
    }

    // Check token expiry
    if (user.token_expires_at && new Date() > new Date(user.token_expires_at)) {
      return res.status(400).json({ error: 'Verification link has expired.' });
    }

    // Mark as verified and clear token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: { is_verified: true },
        $unset: { verification_token: '', token_expires_at: '' }
      }
    );

    return res.status(200).json({ message: 'Email verified successfully!' });

  } catch (err) {
    console.error('Verify email error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const db = await connectDB();

    const user = await db.collection('users').findOne({ login: email });

    if (!user) {
      return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });
    }

    //generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    //store token on user
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          reset_token: resetToken,
          reset_token_expires: resetExpiry
        }
      }
    );

    //send email
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await transporter.sendMail({
      from: `"Landmark" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>Hi ${user.firstName},</p>
        <p>Click the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetLink}" style="
          background:#3b82f6;
          color:white;
          padding:12px 24px;
          border-radius:6px;
          text-decoration:none;
          display:inline-block;
          margin:16px 0;
        ">Reset Password</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    });

    return res.status(200).json({ message: 'If an account exists, a reset link has been sent.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  try {
    const db = await connectDB();

    const user = await db.collection('users').findOne({
      reset_token: token,
      reset_token_expires: { $gt: new Date() } //token not expired
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    //update password and clear reset token
    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: { password: newPassword },
        $unset: { reset_token: '', reset_token_expires: '' }
      }
    );

    return res.status(200).json({ message: 'Password reset successfully!' });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

console.log("step 6");
app.listen(5000); // start Node + Express server on port 5000
