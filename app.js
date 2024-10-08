var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth.route');
const userRouter = require('./routes/user.route');
const eventRouter = require('./routes/event.route');
const ticketRouter = require('./routes/tickets');

const app = express();
const cors = require('cors');
app.use(cors());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/events', eventRouter);
app.use('/api/tickets', ticketRouter);

module.exports = app;
