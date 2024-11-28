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
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("fd");

    // Insert the new user into the database
    await connection.execute(
      `INSERT INTO users (user_id, user_name,email, password) VALUES (user_id_seq.NEXTVAL, :user_name, :email, :password)`,
      { user_name : username, email, password: hashedPassword }
    );
    console.log("sf")

    await connection.commit();

    // Generate OTP
    const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
    // req.flash("email" , email);
    // req.flash("otp" , otp)
    req.session.email = email
    // req.session.otp = otp

    // Set OTP expiry to 5 minutes from now
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

    // Update user with OTP and expiry in Oracle SQL
      await connection.execute(
        `UPDATE USERS SET otp = :otp, OTP_EXPIRY = :otp_Expiry WHERE USER_NAME = :user_name`,
        { otp : otp, otp_Expiry: otpExpiry, user_name: username }    
    );
    console.log("jsd")
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
  const otp = req.body;
  console.log(email)

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
    const storedOtp = user[6]; // Get the stored OTP
    const otpExpiry = user[7] // Get OTP expiry
    console.log(storedOtp)
    console.log(otpExpiry)

    // Check OTP and expiry time
    if (storedOtp === otp && Date.now() <= otpExpiry) {
      // OTP is valid and not expired
      await connection.execute(
        `UPDATE USERS SET OTP = NULL, OTP_EXPIRY = NULL WHERE EMAIL = :email`,
        [email]
      );
      await connection.commit(); // Clear the OTP from the database

      res.json({ message: 'OTP verified successfully! You can now log in as ${user[3]} .' });
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


async function login(req, res, next) {
      const { email, password } = req.body;
    // const email = "davidalbert.eth@gmail.com";
    //   const password = "abcde";        //abc/
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
        console.log(req.session.user);
          return next();
      } else {
          return res.status(401).json({ message: 'Unauthorized. Please log in.' });
      }
  }
  function getSessionUser(req) {
    console.log(req.session.user)
    return req.session && req.session.user ? req.session.user : null;
}  
// Export functions
module.exports = { register, verify_otp ,login, logout, isAuthenticated, getSessionUser};





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






// async function register(req, res) {
//   const { username, email, password } = req.body;

//   if (!username || !email || !password) {
//     return res.status(400).json({ message: 'All fields are required.' });
//   }

//   let connection;
//   try {
//     connection = await getConnection();

//     // Check if the user already exists
//     const existingUser = await connection.execute(
//       `SELECT * FROM users WHERE email = :email`,
//       { email }
//     );

//     if (existingUser.rows.length > 0) {
//       return res.status(400).json({ message: 'User already exists.' });
//     }

//     // Hash the password and store the user in the database
//     const hashedPassword = await bcrypt.hash(password, 10);
//     await connection.execute(
//       `INSERT INTO users (user_id, user_name, email, password) VALUES (user_id_seq.NEXTVAL, :user_name, :email, :password)`,
//       { user_name: username, email, password: hashedPassword }
//     );
//     // await connection.commit();
//        // Generate OTP
//     const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false });
//     const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // OTP expiry in 5 minutes

//     // Store OTP in the database
//     await connection.execute(
//       `UPDATE users SET otp = :otp, otp_expiry = :otp_expiry WHERE email = :email`,
//       { otp, otp_expiry, email }
//     );
//     // await connection.commit();

//     // Send OTP via email
//     let mailOptions = {
//       from: process.env.GMAIL,
//       to: email,
//       subject: 'Your OTP for Registration',
//       text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
//     };

//     transporter.sendMail(mailOptions, function (error, info) {
//       if (error) {
//         console.log('Error sending OTP:', error);
//         return res.status(500).send('Error sending OTP');
//       }
//       res.status(200).json({ message: 'OTP sent successfully.' });
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Error registering user.', error: err.message });
//   } finally {
//     if (connection) {
//       await connection.close();
//     }
//   }
// }

// async function verify_otp(req, res) {
//   const { email, otp } = req.body;

//   let connection;
//   try {
//     connection = await getConnection();

//     const userResult = await connection.execute(
//       `SELECT otp, otp_expiry FROM users WHERE email = :email`,
//       { email }
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(400).json({ message: 'User not found.' });
//     }

//     const { otp: storedOtp, otp_expiry } = userResult.rows[0];

//     // Check if OTP has expired
//     if (new Date() > new Date(otp_expiry)) {
//       return res.status(400).json({ message: 'OTP has expired.' });
//     }

//     // Check if the entered OTP matches the stored OTP
//     if (otp !== storedOtp) {
//       return res.status(400).json({ message: 'Incorrect OTP.' });
//     }

//     // Complete the registration process (e.g., marking the user as active)
//     await connection.execute(
//       `UPDATE users SET status = 'active' WHERE email = :email`,
//       { email }
//     );
//     await connection.commit();

//     res.status(200).json({ message: 'OTP verified successfully. Registration complete.' });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Error verifying OTP.', error: err.message });
//   } finally {
//     if (connection) {
//       await connection.close();
//     }
//   }
// }

