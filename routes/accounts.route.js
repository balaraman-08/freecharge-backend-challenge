const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const csv = require("fast-csv");

const accountRoute = express();
accountRoute.use(bodyParser.json());

/* Setup multer to upload CSV */
const multer = require("multer");
const fileUploadDir = "./transactions/";
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(fileUploadDir)) {
      fs.mkdirSync(fileUploadDir);
    }
    cb(null, fileUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, getFilename(req.user.accountNumber, file.originalname));
  },
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, callback) => {
    const ext = file.originalname.substr(
      file.originalname.lastIndexOf(".") + 1
    );
    if (ext !== "csv") {
      return callback(new Error("Only CSV is allowed"));
    }
    callback(null, true);
  },
}).single("file");

const getFilename = (accountNumber, originalname) => {
  var ext = originalname.substr(originalname.lastIndexOf(".") + 1);

  // Get date
  var d = new Date();
  var date = [
    d.getFullYear(),
    d.getMonth().toString().padStart(2, 0),
    d.getDate().toString().padStart(2, 0),
  ].join("");
  var time = [
    d.getHours().toString().padStart(2, 0),
    d.getMinutes().toString().padStart(2, 0),
    d.getSeconds().toString().padStart(2, 0),
  ].join("");
  return [accountNumber, date, time].join("_").concat(".", ext);
};

const dbConnection = require("../db/dbConnection");

accountRoute.get("/account", (req, res) => {
  const user = req.user;
  dbConnection.getDB().then(async (db) => {
    const userCollection = db.collection("users");
    const userDetails = await userCollection
      .findOne(
        { username: user.username },
        { projection: { password: 0, _id: 0 } }
      )
      .catch((err) => {
        res.status(500).send(err);
        return;
      });
    res.send(userDetails);
  });
});

accountRoute.post(
  "/transactions",
  (req, res, next) => {
    /* File upload middleware */
    upload(req, res, (err) => {
      if (err) {
        res.status(401).send(err.message);
      } else {
        next();
      }
    });
  },
  (req, res) => {
    if (req.file) {
      const transactionData = [];
      fs.createReadStream(
        path.resolve(
          path.dirname(require.main.filename),
          "transactions",
          req.file.filename
        )
      )
        .pipe(csv.parse({ headers: true }))
        .on("error", (error) => console.error(error))
        .on("data", (row) => {
          if (row["Date"] !== "") {
            transactionData.push({
              date: new Date(row["Date"]),
              description: row["Description"],
              closingBalance: row["Closing Balance"],
              type: row["Withdraw"] === "" ? "deposit" : "withdrawal",
              amount:
                row["Withdraw"] === ""
                  ? parseInt(row["Deposit"])
                  : parseInt(row["Withdraw"]),
            });
          }
        })
        .on("end", (rowCount) => {
          console.log(transactionData);
          dbConnection.getDB().then(async (db) => {
            const userCollection = db.collection("users");
            await userCollection
              .updateOne(
                { accountNumber: req.user.accountNumber },
                { $set: { transactions: transactionData } }
              )
              .catch((err) => {
                console.log("Couldn't update transactions", err);
                res.status(500).send("Internal server error");
                return;
              });
            res.send({ message: transactionData });
          });
        });
      console.log(req.file.filesize);
      return;
    }
    res.status(500).send({ message: "Error" });
  }
);

module.exports = accountRoute;
