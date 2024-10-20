// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection } = require('../db/dbconfig');
const nodemailer = require('nodemailer');
const otpGenerator = require('otp-generator');
const session = require('express-session');
const flash = require('connect-flash');

// Configure Nodemailer
let transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.GMAIL,  
      pass: process.env.PASSWORD     
    }
});

// Register a new user
async function register(req, res) {
//   const { username, password } = req.body; // Ensure email is included in the request
    const username = "Ahmed"
    const password = "abcde"
    const email = "k224825@nu.edu.pk"

  if (!username || !password || !email) {
    return res.status(400).json({ message: 'Username, password, and email are required.' });
  }
  let connection;

  try {
    connection = await getConnection();

    // Check if the username already exists
    const existingUser = await connection.execute(
      `SELECT * FROM users WHERE username = :username`,
      { username }
    );

    if (existingUser.rows.length > 0) {
      await connection.close();
      return res.status(400).json({ message: 'Username already exists.' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await connection.execute(
      `INSERT INTO users (username, password, email) VALUES (:username, :password, :email)`,
      { username, password: hashedPassword, email }
    );

    await connection.commit();

    // Generate OTP
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    // req.flash("email" , email);
    // req.flash("otp" , otp)
    req.session.email = email
    req.session.otp = otp

    // Set OTP expiry to 5 minutes from now
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Update user with OTP and expiry in Oracle SQL
    await connection.execute(
      `UPDATE USERS SET OTP = :otp, OTPEXPIRY = :otpExpiry WHERE USERNAME = :username`,
      [otp, otpExpiry, username]
    );
    await connection.commit(); // Commit the transaction

    // Send OTP via Nodemailer
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
        
        // Respond to the user with a message indicating OTP has been sent
        res.status(200).json({ message: 'Registration successful! Please verify your OTP.' });
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
//   const email = req.flash("email")[0]
//   const otp = req.flash("otp")[0]
const email = req.session.email
  const otp = req.session.otp

  let connection;

  try {
    connection = await getConnection();
    console.log(email)
    console.log(otp)

    // Fetch the user by username
    const userResult = await connection.execute(
      `SELECT * FROM USERS WHERE EMAIL = :email`,
      [email]
    );
    console.log(userResult)

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'User not found.' });
    }

    const user = userResult.rows[0]; // Get the user
    console.log(user)
    const storedOtp = user[3]; // Get the stored OTP
    const otpExpiry = user[4] // Get OTP expiry
    console.log(storedOtp)
    console.log(otpExpiry)

    // Check OTP and expiry time
    if (storedOtp === otp && Date.now() <= otpExpiry) {
      // OTP is valid and not expired
      await connection.execute(
        `UPDATE USERS SET OTP = NULL, OTPEXPIRY = NULL WHERE EMAIL = :email`,
        [email]
      );
      await connection.commit(); // Clear the OTP from the database

      res.json({ message: 'OTP verified successfully! You can now log in.' });
    } else {
        // await connection.execute(
        //     `UPDATE USERS SET OTP = NULL, OTPEXPIRY = NULL WHERE USERNAME = :username`,
        //     [username]
        //   );
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


async function login(req, res) {
    //   const { username, password } = req.body;
    const username = "Hamza";
      const password = "abcde";
    
    
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
      }
    
      try {
        const connection = await getConnection();
    
        // Fetch user from the database
        const result = await connection.execute(
          `SELECT * FROM users WHERE username = :username`,
          { username }
        );
    
        await connection.close();
    
        if (result.rows.length === 0) {
          return res.status(400).json({ message: 'Invalid credentials.' });
        }
    
        const user = result.rows[0];
    
        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user[1]); // Assuming user[1] is the password
    
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials.' });
        }
    
        // Generate JWT token
        const token = jwt.sign({ userId: user[0], username: user[1] }, JWT_SECRET, {
          expiresIn: '1h',
        });
    
        res.json({ token, message: 'Login successful!' });
      } catch (err) {
        res.status(500).json({ message: 'Error logging in user.', error: err.message });
      }
    }
// Export functions
module.exports = { register, verify_otp ,login};





// router.post("/login", async (req, res) => {
// //   const { username, password } = req.body;
//     const username = "Hamza"
//     const password = "abcde"

//     let connection;

//   try {
//     // Establish a connection to the Oracle database
//     connection = await getConnection()
//     // Fetch user by username
//     const userResult = await connection.execute(
//       `SELECT * FROM USERS WHERE USERNAME = :username`,
//       [username]
//     );

//     if (userResult.rows.length === 0) {
//       return res.redirect("/user/login");
//     }

//     const user = userResult.rows[0]; // Assuming the first row is the user
//     const storedPassword = user[2]; // Assuming the password is in the third column

//     // Compare password (implement your own logic for hashed password comparison)
//     const isPasswordValid = await comparePassword(password, storedPassword); // Implement this function

//     if (!isPasswordValid) {
//       return res.redirect("/user/login");
//     }

//     // Generate OTP
//     const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    
//     // Set OTP expiry to 5 minutes from now
//     const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

//     // Update user with OTP and expiry in Oracle SQL
//     await connection.execute(
//       `UPDATE USERS SET OTP = :otp, OTP_EXPIRY = :otpExpiry WHERE USERNAME = :username`,
//       [otp, otpExpiry, username]
//     );
//     await connection.commit(); // Commit the transaction

//     // Send OTP via Nodemailer
//     let mailOptions = {
//         from: 'hamzaahmedmemon10@gmail.com',  // Sender address
//         to: user.email,                // User's email address
//         subject: 'Your OTP for Login', // Subject line
//         text: `Your OTP is ${otp}. It is valid for the next 5 minutes.`  // Plain text body
//       };

//     transporter.sendMail(mailOptions, function(error, info) {
//       if (error) {
//         console.log('Error sending OTP:', error);
//         return res.status(500).send('Error sending OTP');
//       } else {
//         console.log('OTP sent: ' + info.response);
        
//         // Generate JWT token and send it back to the client
//         const token = jwt.sign({ userId: user[0] }, 'your_jwt_secret', { expiresIn: '1h' }); // Adjust secret and expiration as needed
        
//         res.status(200).json({ token, message: 'OTP sent successfully. Proceed to verify OTP.' });
//       }
//     });
//   } catch (error) {
//     console.error('Error during login:', error);
//     res.status(500).send('Server error');
//   } finally {
//     if (connection) {
//       try {
//         await connection.close(); // Close the connection
//       } catch (err) {
//         console.error(err);
//       }
//     }
//   }
// });

// async function verify_otp(req, res) {
//     const { otp } = req.body;
  
//     // Find user by session or username
//     const user = await userModel.findOne({ username: req.session.passport.user });
  
//     // Check OTP and expiry time
//     if (user.otp === otp && Date.now() < user.otpExpiry) {
//       // OTP is valid and not expired
//       user.otp = null;  // Clear OTP after verification
//       user.otpExpiry = null;  // Clear expiry time
//       await user.save();
      
//       res.redirect("/user/profile");
//     } else {
//       res.send('Invalid or expired OTP. Please try again.');
//     }
//   };
  

// // JWT secret key
// const JWT_SECRET = 'yourSecretKey';

// // Register a new user
// async function register(req, res) {
// //   const { username, password } = req.body;
//   const username = "Ahmed";
//   const password = "abcde";

//   if (!username || !password) {
//     return res.status(400).json({ message: 'Username and password are required.' });
//   }

//   try {
//     console.log("0")

//     const connection = await getConnection();
//     console.log("11")

//     // Check if the username already exists
//     const existingUser = await connection.execute(
//       `SELECT * FROM users WHERE username = :username`,
//       { username }
//     );

//     if (existingUser.rows.length > 0) {
//       await connection.close();
//       return res.status(400).json({ message: 'Username already exists.' });
//     }
//     console.log("1")

//     // Hash the password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert the new user into the database
//     await connection.execute(
//       `INSERT INTO users (username, password) VALUES (:username, :password)`,
//       { username, password: hashedPassword }
//     );
//     console.log("2")


//     await connection.commit();
//     await connection.close();

//     res.status(201).json({ message: 'User registered successfully!' });
//   } catch (err) {
//     res.status(500).json({ message: 'Error registering user.', error: err.message });
//   }
// }

// // Login user and generate JWT
// async function login(req, res) {
// //   const { username, password } = req.body;
// const username = "Hamza";
//   const password = "abcde";


//   if (!username || !password) {
//     return res.status(400).json({ message: 'Username and password are required.' });
//   }

//   try {
//     const connection = await getConnection();

//     // Fetch user from the database
//     const result = await connection.execute(
//       `SELECT * FROM users WHERE username = :username`,
//       { username }
//     );

//     await connection.close();

//     if (result.rows.length === 0) {
//       return res.status(400).json({ message: 'Invalid credentials.' });
//     }

//     const user = result.rows[0];

//     // Check if the password is correct
//     const isMatch = await bcrypt.compare(password, user[1]); // Assuming user[1] is the password

//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials.' });
//     }

//     // Generate JWT token
//     const token = jwt.sign({ userId: user[0], username: user[1] }, JWT_SECRET, {
//       expiresIn: '1h',
//     });

//     res.json({ token, message: 'Login successful!' });
//   } catch (err) {
//     res.status(500).json({ message: 'Error logging in user.', error: err.message });
//   }
// }

// module.exports = { register, login, verify_otp };