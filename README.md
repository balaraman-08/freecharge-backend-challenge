# Freecharge Backend Challenge

This website was made as a part of the Freecharge Backend Challenge.

## How to view the project

After unzipping the folder, run `npm install` to install dependencies.
Setup env
Create .env file with following

    - PORT=8080
    - NODE_ENV=development
    - DATABASE_URL=SAMPLE_MONGO_URL
    - TOKEN_SECRET=sample_token_secret_for_jwt
    - TOKEN_EXPIRY=3600s

Once that is done, you can run `npm start` to view the project in your browser.

POST /register - To create user `{username, name, password}`

POST /login - To login `{username, password}` - returns token

###Set that token as bearer to use following endpoints

GET /account - To get account details

POST /transaction - Upload csv with key `file`
