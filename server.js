console.log("step 1");
require('dotenv').config();

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
app.use(express.json());

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

    // create new user
    const newUser = {
      firstName: firstName,
      lastName: lastName,
      login: login,
      password: password,
      createdAt: new Date(),
      trips: []
    };

    const result = await db.collection('users').insertOne(newUser);
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

console.log("step 6");
app.listen(5000); // start Node + Express server on port 5000
