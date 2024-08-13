const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/protect.middleware');
const { allEvents, AllTicketAndRegistration, updateEvent, createEvent, TicketReg } = require('../controllers/events.controller');

router.get('/', authenticate, allEvents);

router.post('/new', authenticate, createEvent);

router.post('/register', authenticate, TicketReg);

router.get('/my-tickets', authenticate, AllTicketAndRegistration);

router.put('/update/:eventId', authenticate, updateEvent);

module.exports = router;
