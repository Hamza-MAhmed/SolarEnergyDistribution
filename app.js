var createError = require('http-errors');
var express = require('express');
const session = require('express-session');
const cors = require('cors');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const flash = require('connect-flash');
require('dotenv').config();
const PORT = process.env.PORT || 4000;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var postsRouter = require('./routes/posts');
var transactionsRouter = require('./routes/transaction');
var techCommissionRouter = require('./routes/techCommission');
var dashboardRouter = require('./routes/userDashboard');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cors({
  origin: 'http://localhost:5173', // Replace with your frontend's URL
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed headers
  credentials : true
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'your-secret-key', // Replace with a secure key
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour (duration in milliseconds)
    httpOnly: true,         // Prevent client-side script access to cookies
    secure: false          // Set to true if using HTTPS
},
}));
app.use(flash());

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/posts', postsRouter);
app.use('/transactions', transactionsRouter);
app.use('/admin', techCommissionRouter);
app.use('/dashboard', dashboardRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// const PORT = process.env.PORT || 4000;
// app.listen(PORT, (err) => {
//   if (err) {
//     console.error(`Error starting server: ${err.message}`);
//     process.exit(1); // Exit the process if there's an error
//   }
//   console.log(`Server is running on port ${PORT}`);
// });




module.exports = app;
