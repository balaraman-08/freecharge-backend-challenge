const MongoClient = require("mongodb").MongoClient;
const Db = require("mongodb").Db;
/**
 * @type {MongoClient}
 */
let client = undefined;

/**
 * Initiates a client object and returns DB Connection object
 * @returns {Promise<Db>} DB Connection object
 */
const connectDB = () => {
  return new Promise(async (resolve, reject) => {
    client = new MongoClient(process.env.DATABASE_URL, {
      useUnifiedTopology: true,
    });
    await client.connect().catch((err) => {
      console.log("Couldn't connect to database", err);
      reject("Couldn't connect to database");
    });
    const db = client.db("upi_2");
    resolve(db);
  });
};

/**
 * Returns DB Connection object if client is initialized
 * otherwise calls connectDB function
 * @returns {Promise<Db>} DB Connection object
 */
const getDB = () => {
  if (client) {
    const db = client.db("upi_2");
    return new Promise((resolve, _reject) => {
      resolve(db);
    });
  } else {
    return connectDB();
  }
};

/**
 * Closes client connection
 */
const closeDB = () => {
  if (client) {
    client.close();
    console.log("DB Connection closed");
  }
};

module.exports = { connectDB, getDB, closeDB };
