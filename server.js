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

app.post('/api/login', async (req, res, next) => 
{
  // incoming: login, password
  // outgoing: id, firstName, lastName, error

  var error = '';

  const { login, password } = req.body;

  var id = -1;
  var fn = '';
  var ln = '';

  if( login.toLowerCase() == 'rickl' && password == 'COP4331' )
  {
    id = 1;
    fn = 'Rick';
    ln = 'Leinecker';
  }
  else
  {
    error = 'Invalid user name/password';
  }

  var ret = { id:id, firstName:fn, lastName:ln, error:error};
  res.status(200).json(ret);
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

console.log("step 6");
app.listen(5000); // start Node + Express server on port 5000
