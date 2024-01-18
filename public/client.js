//a way to store user credentials and send them back to their respective security keys when needed
let usersCred = [];


document.addEventListener('DOMContentLoaded', () => {
  //display elements
  const userDisplay = document.getElementById('user-display');
  const balanceDisplay = document.getElementById('balance');
  const loginContainer = document.getElementById('login-container');
  const dashboard = document.getElementById('dashboard');

  //function to allow user to login
  const login = async () => {
    //retrieve the username and password entered by the user
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    //send these values to the server to authenticate the user
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    //wait for the response from the server
    const result = await response.json();

    //if the result is successful then change the display to reveal the user's account
    if (result.success) {
      userDisplay.innerText = result.user.username;
      balanceDisplay.innerText = result.balance.toFixed(2);
      loginContainer.style.display = 'none';
      dashboard.style.display = 'block';
    } else {
      alert(result.message);
    }
  };

  //function to allow users to register
  const register = async () => {
    //retrieve the username and password entered by the user
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    //send these values to the server to create a profile for the user
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    
    //wait for the response from the server
    const result = await response.json();

    //if the result is successful then change the display to reveal the user's account
    if (result.success) {
      userDisplay.innerText = result.user.username;
      balanceDisplay.innerText = result.user.balance.toFixed(2);
      loginContainer.style.display = 'none';
      dashboard.style.display = 'block';
    } else {
      alert(result.message);
    }
  };

  //function to allow users to register using the WebAuthn API
  const registerWebAuthn = async () => {
    //retrieve the username entered by the user
    const username = document.getElementById('username').value;

    //send the username to the server to generate a challange for the user
    const response = await fetch('/registerWebAuthn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    //wait for the response from the server
    const result = await response.json();

    //if the result is successful then 
    if (result.success) {

      //store the registration challange from the response
      const registrationchallenge = result.webAuthnChallenge;
      console.log(registrationchallenge)
      
      //create a credentials object that contains the public key with the necessary values 
      const credential = await navigator.credentials.create({
        publicKey: {
            challenge: Uint8Array.from(atob(registrationchallenge), c => c.charCodeAt(0)),
            rp: { name: 'My Bank' },
            user: { id: Uint8Array.from(username, c => c.charCodeAt(0)), name: username, displayName: username },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
            timeout: 60000,
            attestation: 'direct',
        }
    });
      const credentialData = credential.response;
      console.log(credential)
      console.log(credential.id)

      //send the credential information to the server
      const registrationResponse = await fetch('/completeWebAuthnRegistration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          credentialId: credential.id,
        }),
      });

      //wait for the response from the server
      const registrationResult = await registrationResponse.json();

      //if the result is successful then
      if (registrationResult.success) {
        //send an alert regarding the successful registration
        alert('WebAuthn registration successful');

        //store the credential information for the user
        const newUser = { username, credential};
        usersCred.push(newUser);

        //change the display to reveal the user's account information
        userDisplay.innerText = registrationResult.user.username;
        balanceDisplay.innerText = registrationResult.balance.toFixed(2);
        loginContainer.style.display = 'none';
        dashboard.style.display = 'block';
      } else {
        alert(registrationResult.message);
      }
    } else {
      alert(result.message);
    }
  };

  //function to allow users to login using the WebAuthn API
  const loginWebAuthn = async () => {
    //retrieve the username entered by the user
    const username = document.getElementById('username').value;

     //send the username to the server to generate a challange for the user
    const response = await fetch('/loginWebAuthn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    //wait for the response from the server
    const result = await response.json();

    //if the result is successful then 
    if (result.success) {

      //store the login challange from the response
      const loginchallenge = result.webAuthnChallenge;
      //make sure the credential provided by the user's device mataches the one that was used when they registered
      const allowCred = result.allowedCred;
      console.log(loginchallenge)
      console.log(allowCred)
      var rawid;
      //verify if the user has a credential associated with their account
      const us = usersCred.find(u => u.username === username);
      if (us) {
        console.log("usercred")
        console.log(us.credential)
        rawid = us.credential.rawId
      }
      else{
        console.log("userCred error")
      }
      console.log(rawid)
      //get user to use their credential to solve the challange and extract the data
      const credential = await navigator.credentials.get({
        publicKey: {
            challenge: Uint8Array.from(atob(loginchallenge), c => c.charCodeAt(0)),
            allowCredentials: [{ type: 'public-key', id: rawid}],
        }
    });
      const credentialData = credential.response;

      //send the credential information to the server to verify authentication
      const authenticationResponse = await fetch('/completeWebAuthnLogin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          credentialId: credential.id,
          signature: credentialData.signature,
        }),
      });

       //wait for the response from the server
      const authenticationResult = await authenticationResponse.json();

      //if the result is successfull then display the user's account infromation
      if (authenticationResult.success) {
        alert('WebAuthn login successful');
        userDisplay.innerText = authenticationResult.user.username;
        balanceDisplay.innerText = authenticationResult.balance.toFixed(2);
        loginContainer.style.display = 'none';
        dashboard.style.display = 'block';
      } else {
        alert('WebAuthn login failed');
      }
    } else {
      alert(result.message);
    }
  };

  //function to add funds to the user's balance
  const addFunds = () => {
    const amount = parseFloat(prompt('Enter amount to add:'));
    if (!isNaN(amount)) {
      const currentBalance = parseFloat(balanceDisplay.innerText);
      const newBalance = currentBalance + amount;
      balanceDisplay.innerText = newBalance.toFixed(2);
    }
  };

  //function to remove funds from the user's balance
  const removeFunds = () => {
    const amount = parseFloat(prompt('Enter amount to remove:'));
    if (!isNaN(amount)) {
      const currentBalance = parseFloat(balanceDisplay.innerText);
      const newBalance = currentBalance - amount;
      balanceDisplay.innerText = newBalance.toFixed(2);
    }
  };

  //function to faciliate the logout process
  const logout = async () => {
    //retrieve the entered username
    const username = document.getElementById('username').value;

    //retrieve the balance shown in the display when the user logs out
    const balance = parseFloat(balanceDisplay.innerText);

    //change the display to go back to what it was before the user logged in
    loginContainer.style.display = 'block';
    dashboard.style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    //send the user's balance to the server for storage
    const response = await fetch('/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({username, balance }),
    });
    const result = await response.json();

    //alert the user regarding the logout process
    if (result.success) {
      alert("Successful Logout");
    } else{
      alert("Problem during logout");
    }
  };

  window.login = login;
  window.register = register;
  window.registerWebAuthn = registerWebAuthn;
  window.loginWebAuthn = loginWebAuthn;
  window.addFunds = addFunds;
  window.removeFunds = removeFunds;
  window.logout = logout;
});
