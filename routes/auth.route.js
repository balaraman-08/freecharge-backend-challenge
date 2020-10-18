const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

/* Function to generate random 8 digit number */
const { customAlphabet } = require("nanoid");
/* Custom alphabet for generate function */
const alphabet = "0123456789";
const generate = customAlphabet(alphabet, 8);

/**
 * Returns a JWT Token with given payload
 * @param {Object} payload
 * @param {string} payload.username
 * @param {string} payload.accountNumber
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.TOKEN_SECRET, {
    expiresIn: process.env.TOKEN_EXPIRY,
  });
};

const authRoute = express();
authRoute.use(bodyParser.json());

const dbConnection = require("../db/dbConnection");

/**
 * Returns hashed password
 * @param {string} password Password to hash
 * @param {string} salt Random salt used for hashing
 * @returns {string} Hashed Password
 */
const hash = (password, salt) => {
  var hashed = crypto.pbkdf2Sync(password, salt, 10000, 512, "sha512");
  return ["pdkdf2", "10000", salt, hashed.toString("hex")].join("$");
};
//-----------------------------------------------------------------------------------

/* Endpoint to register user */
authRoute.post("/register", (req, res) => {
  const { name, username, password } = req.body;

  if (!(name && username && password)) {
    res.status(400).send({
      message: "Bad request. Required fields: name, username, password",
    });
  } else {
    dbConnection
      .getDB()
      .then(async (db) => {
        const userCollection = db.collection("users");

        /* Generate RANDOM 8 digit account number */
        const accountNumber = generate();

        // Find if user with given username or generated account number exists
        const users = await userCollection
          .find({ $or: [{ username }, { accountNumber }] })
          .toArray()
          .catch((err) => {
            console.log("Error in finding user", err);
            throw new Error("Error in finding user");
          });

        if (users.length > 0) {
          res.status(400).send({
            message: `username ${username} already exists or account number exists try again`,
          });
          return;
        }

        // Create a random salt for each user to hash the password
        const salt = crypto.randomBytes(128).toString("hex");
        const hashedPassword = hash(password, salt);

        await userCollection
          .insertOne({
            name,
            accountNumber,
            username,
            password: hashedPassword,
          })
          .catch((err) => {
            console.log({ url: req.url, err });
            res.status(500).send("Couldn't insert user");
            return;
          });
        res.status(201).send({ data: { name, accountNumber, username } });
      })
      .catch((err) => {
        console.log({ url: req.url, err });
        res.status(500).send("Couldn't connect DB");
      });
  }
});

/* Endpoint to register user */
authRoute.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!(username && password)) {
    res.status(400).send({
      message: "Bad request. Required fields: username, password",
    });
  } else {
    dbConnection
      .getDB()
      .then(async (db) => {
        const userCollection = db.collection("users");

        // Find if user with given username
        const user = await userCollection.findOne({ username }).catch((err) => {
          console.log("Error in finding user", err);
          throw new Error("Error in finding user");
        });

        if (!user) {
          res.status(401).send({
            message: `Invalid credentials`,
          });
          return;
        }

        const actualPassword = user.password;
        // Create a random salt for each user to hash the password
        const salt = actualPassword.split("$")[2];
        const hashedPassword = hash(password, salt);
        if (actualPassword !== hashedPassword) {
          res.status(401).send({
            message: `Invalid credentials`,
          });
          return;
        }
        const accessToken = generateAccessToken({
          username: req.body.username,
          accountNumber: user.accountNumber,
        });
        res.status(200).send({
          name: user.name,
          accountNumber: user.accountNumber,
          accessToken,
        });
      })
      .catch((err) => {
        console.log({ url: req.url, err });
        res.status(500).send("Couldn't connect DB");
      });
  }
});

module.exports = authRoute;
