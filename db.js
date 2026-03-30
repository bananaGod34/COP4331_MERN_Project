const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGODB_URL);
let db;

async function connectDB() {
    if (!db) {
        await client.connect();
        db = client.db('TravelApp');
        console.log("Connected to Database");
    }
    return db;
}

module.exports = connectDB;