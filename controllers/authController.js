// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db/dbconfig');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const session = require('express-session');
const flash = require('connect-flash');
const { use } = require('../routes');

// Configure Nodemailer
let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.GMAIL,  
      pass: process.env.PASSWORD     
    }
});
const JWT_SECRET = process.env.JWT_SECRET;
// // Register a new user
async function register(req, res) {
  const { username,email, password } = req.body; // Ensure email is included in the request
    // const username = "Adnan"
    // const password = "abc"
    // const email = "hamzaahmedmemon01@gmail.com"
    // const type = "normal"
    console.log(process.env.GMAIL)
    console.log(process.env.PASSWORD)
    const hashedPassword = await bcrypt.hash(password, 10);
  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Username, password, and email are required.' });
  }
  let connection;

  try {
    connection = await getConnection();

    // Check if the username already exists
    const existingUser = await connection.execute(
      `SELECT * FROM users WHERE email = :email`,
      { email }
    );
    console.log(email,"fs")

    if (existingUser.rows.length > 0) {
      await connection.close();
      console.log("ab")
      return res.status(400).json({ message: 'Account already exists.' });
    }
    
    // Hash the password
    console.log("fd");

    
    console.log("sf")

    await connection.commit();

    // Generate OTP
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    // req.flash("email" , email);
    // req.flash("otp" , otp)
    // req.session.email = email
    // req.session.otp = otp

    // Set OTP expiry to 5 minutes from now
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    console.log("jsd")
    const user = {
      username: username,
      email: email,
      password: hashedPassword,
      otp: otp,
      otpExpiry: otpExpiry
    }
    let mailOptions = {
        from: process.env.GMAIL,  
        to: email,                 
        subject: 'Your OTP for Registration', 
        text: `Your OTP is ${otp}. It is valid for the next 5 minutes.`  
    };

    transporter.sendMail(mailOptions, async function(error, info) {
      if (error) {
        console.log('Error sending OTP:', error);
        return res.status(500).send('Error sending OTP');
      } else {
        console.log('OTP sent: ' + info.response);
        
        res.status(200).json({ user,message: 'Registration successful! Please verify your OTP.' });
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error registering user.', error: err.message });
  } finally {
    if (connection) {
      try {
        await connection.close(); // Close the connection
      } catch (err) {
        console.error(err);
      }
    }
  }
}

// OTP verification function
async function verify_otp(req, res) {
  const {user , enteredOtp} = req.body;
  console.log(user)
  console.log(enteredOtp,"otp enter")
  let connection;

  try {
    connection = await getConnection();
   

    // Check OTP and expiry time
    if (enteredOtp == user.otp && Date.now() <= user.otpExpiry) {
      // Insert the new user into the database
    await connection.execute(
      `INSERT INTO users (user_id, user_name,email, password) VALUES (user_id_seq.NEXTVAL, :user_name, :email, :password)`,
      { user_name : user.username, email : user.email, password: user.password}
    );
      await connection.commit(); // Clear the OTP from the database

      res.json({ message: 'OTP verified successfully! You can now log in as ${user[3]} .' });
    } else {
      res.status(400).json({ message: 'Invalid or expired OTP. Please try again.' });
    }
  } catch (error) {
    console.error('Error during OTP verification:', error);
    res.status(500).send('Server error');
  } finally {
    if (connection) {
      try {
        await connection.close(); // Close the connection
      } catch (err) {
        console.error(err);
      }
    }
  }
}


async function login(req, res, next) {
      const { email, password } = req.body;
      // const email = "davidalbert.eth@gmail.com";
      // const password = "abcde";      //abc/
      if (!email || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
      }
      try {
        const connection = await getConnection();
        // Fetch user from the database
        const result = await connection.execute(
          `SELECT * FROM users WHERE email = :email`,
          { email }
        );
    
        await connection.close();
    
        if (result.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid credentials.' });
        }
    
        const user = result.rows[0];
    
        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user[3]); // Assuming user[1] is the password
    
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials.' });
        }
        req.session.user = {
          user_id: user[0],
          email: user[2],
          role: user[4],
          user_name: user[1]
      };   
      console.log(req.session.user)
        // Generate JWT token
        const token = jwt.sign({ user_Id: user[0], user_name: user[1] }, JWT_SECRET, {
          expiresIn: '1h',
        });
        user[4] == "Admin" ? res.json({ token, message: 'Login successful! Admin' }) :
         res.json({ token, message: 'Login successful! User' });

         console.log(req.session.user);
         const user1 = getSessionUser(req);

        // res.json({ token, message: 'Login successful!' });
      } catch (err) {
        res.status(500).json({ message: 'Error logging in user.', error: err.message });
      }
    }

    function logout(req, res) {
      req.session.destroy((err) => {
          if (err) {
              return res.status(500).json({ message: 'Error logging out.' });
          }
          return res.json({ message: 'Logged out successfully!' });
      });
    }

    function isAuthenticated(req, res, next) {
      if (req.session && req.session.user) {
        // console.log(req.session.user);
          return next();
      } else {
          return res.status(401).json({ message: 'Unauthorized. Please log in.' });
      }
  }
  function getSessionUser(req) {
    // console.log(req.session.user)
    return req.session && req.session.user ? req.session.user : null;
}  
// Export functions
module.exports = { register, verify_otp ,login, logout, isAuthenticated, getSessionUser};