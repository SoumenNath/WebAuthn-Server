//the required dependencies
const crypto = require('crypto');
const express = require('express');
const bodyParser = require('body-parser');
const webauthn = require('@simplewebauthn/server');
const app = express();
const PORT = 3000;

//containers for the user objects and the userBalances objects respectively
let users = [];
let userBalances = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

//post pathway to handle the login from the server side
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  //check if the entered credentials match with the ones in the users array
  const user = users.find(u => u.username === username && u.password === password);
  const userBalance = userBalances[username] || 0;
  if (user) {
    res.json({ success: true, user, balance: userBalance });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

//post pathway to handle the registration from the server side
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  //check if the entered credentials match with the ones in the users array
  const existingUser = users.find(u => u.username === username);

  //if the user exists then notify the client
  if (existingUser) {
    res.json({ success: false, message: 'Username already exists' });
  } else {
     //if the user does not exist then add a new user object to the users array
    const newUser = { username, password, balance: 0.0};
    users.push(newUser);
    //add a new userBalalances object
    userBalances[username] = 0;
    res.json({ success: true, user: newUser });
  }
});

//function to generate a challange
const generateWebAuthnChallenge = () => {
  return crypto.randomBytes(32).toString('base64');
};


//post pathaway to handle the initial user registration via WebAuthn API
app.post('/registerWebAuthn', (req, res) => {

  //determine if the user exists in the server database
  const { username } = req.body;
  const user = users.find(u => u.username === username);

  //if the user exists then send the client the generated challange for their credential to solve
  if (user) {
    const challenge = generateWebAuthnChallenge();

    user.webAuthnChallenge = challenge;

    res.json({ success: true, webAuthnChallenge: user.webAuthnChallenge });
  } else {
    res.json({ success: false, message: 'User not found' });
  }
});

//post pathaway to handle the completion of user registration via WebAuthn API
app.post('/completeWebAuthnRegistration', async (req, res) => {
  const { username, credentialId} = req.body;

  //determine if the user exists in the server database
  const user = users.find(u => u.username === username);

  //if the user exists then
  if (user) {
    try {

      // reset challenge after successful registration
      user.webAuthnChallenge = null; 

      //store the credential id to use later for authentication
      user.webAuthnCredentialId = credentialId;

      console.log(user.webAuthnCredentialId)
      const userBalance = userBalances[username] || 0;

      //send the success message back to the client along with the existing balance and user object
      res.json({ success: true, user: user, balance: userBalance });

    } catch (error) {
      console.error(error);
      res.json({ success: false, message: 'WebAuthn registration failed' });
    }
  } else {
    res.json({ success: false, message: 'User not found' });
  }
});


//post pathaway to handle the intial login via WebAuthn
app.post('/loginWebAuthn', (req, res) => {
  const { username } = req.body;

  //find if the user exisits in the server database
  const user = users.find(u => u.username === username);

  //if the user exists then 
  if (user) {

    //send them the challange alongside the accapteble credential id associated with their account
    const challenge = generateWebAuthnChallenge();
    user.webAuthnChallenge = challenge;
    credID = user.webAuthnCredentialId;
    console.log('retrieving user credential id')
    console.log(user.webAuthnCredentialId)
    res.json({ success: true, webAuthnChallenge: user.webAuthnChallenge, allowedCred: user.webAuthnCredentialId});
  } else {
    res.json({ success: false, message: 'User not found' });
  }
});

//post pathaway to handle the final part of the login authentication via WebAuthn
app.post('/completeWebAuthnLogin', (req, res) => {
  const { username, credentialId, signature } = req.body;

  //determine if the user exists in the server database
  const user = users.find(u => u.username === username);
  
  //if the user exists then
  if (user) {
    // reset challenge after successful login
    user.webAuthnChallenge = null; 
    const userBalance = userBalances[username] || 0;

    //send the client the apporpriate user information including the user's balance
    res.json({ success: true, user: user, balance: userBalance});
  } else {
    res.json({ success: false, message: 'User not found' });
  }
});

//post pathaway to handle the logout process
app.post('/logout', (req, res) => {
  const { username, balance } = req.body;
  const user = users.find(u => u.username);

  //the main purpose of this pathway is to store the user's balance in the server when they choose to logout
  if (user) {
    userBalances[username] = balance;
    res.json({ success: true});
  } else {
    res.json({ success: false});
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
