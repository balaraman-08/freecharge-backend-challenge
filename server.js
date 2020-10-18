// Module imports
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const dotEnv = require("dotenv");

dotEnv.config();

/* Initializes express application */
const app = express();

/* Setup bodyparser middleware */
app.use(bodyParser.json());

/* Setup morgan logger to log events */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

const PORT = process.env.PORT || 8080;

/* Initializing DB connection */
const dbConnection = require("./db/dbConnection");
dbConnection
  .connectDB()
  .then(() => {
    console.log("Connected successfully");
  })
  .catch((err) => {
    console.log("Connection error", err);
  });

/* Sample endpoint to return all the users */
app.get("/", (_req, res) => {
  dbConnection
    .getDB()
    .then(async (db) => {
      const users = await db
        .collection("users")
        .find({}, { projection: { password: 0, _id: 0, transactions: 0 } })
        .toArray()
        .catch((err) => {
          res.status(500).send(err);
          return;
        });
      res.send(users);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.use(require("./routes/auth.route"));

const authenticateToken = (req, res, next) => {
  // Gather the jwt access token from the request header
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token === null)
    return res.status(401).send({ message: "No access token" }); // if there isn't any token

  jwt.verify(token, process.env.TOKEN_SECRET, (err, payload) => {
    console.log(err);
    if (err) return res.status(403).send({ message: "Access token expired" });
    req.user = payload;
    next(); // pass the execution off to whatever request the client intended
  });
};

/* Verify if the user is logged in to access acoount routes */
app.use(authenticateToken);
app.use(require("./routes/accounts.route"));

app.listen(PORT, () => {
  console.log(`Freecharge Hiring Challenge UPI server is running at ${PORT}`);
});
