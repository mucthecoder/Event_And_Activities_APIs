const Event = require("../models/event.model")
const TicketRegistration = require('../models/ticketRegistration.model');
const UserPreference = require("../models/userpreference.model");
const transporter = require("../utils/transport");
const QRCode = require('qrcode'); // Assuming QR codes will be generated
const CryptoJS = require('crypto-js');
const User = require("../models/user.model");

const createEvent = async (req, res) => {
    try {
      const {
        title,
        description,
        location,
        start_time,
        end_time,
        is_paid,
        ticket_price,
        max_attendees,
        images,
        category,
      } = req.body;

      if (!title || !description || !location || !start_time || !end_time || is_paid === undefined) {
        return res.status(400).json({ message: 'Please fill in all required fields' });
      }
  
      const newEvent = new Event({
        user_id: req.user._id,
        title,
        description,
        location,
        start_time,
        end_time,
        is_paid,
        ticket_price: is_paid ? ticket_price : 0,
        max_attendees,
        images,
        category,
      });
  
      // Save the event to the database
      await newEvent.save();
  
      res.status(201).json({ message: 'Event created successfully', event: newEvent });
    } catch (error) {
      console.error('Error creating event:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

const parseTimeToDate = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
};

const allEvents = async (req, res) => {
    try {
        const user_id = req.user._id;

        const userPreference = await UserPreference.findOne({ user_id });

        let events = await Event.find();
        events = events.sort((a, b) => {
            const aInPreferredCategory = userPreference.preferred_category.includes(a.category);
            const bInPreferredCategory = userPreference.preferred_category.includes(b.category);

            if (aInPreferredCategory && !bInPreferredCategory) return -1;
            if (!aInPreferredCategory && bInPreferredCategory) return 1;
            return 0;
        });

        const now = new Date();
        events = events.filter(event => {
            const eventStartTime = parseTimeToDate(event.start_time);
            return eventStartTime >= now;
        });

        res.status(200).json(events);
    } catch (error) {
        console.error('Error in fetching events: ', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const AllTicketAndRegistration = async(req,res)=>{
    try {
        const user_id = req.user._id;

        const registrations = await TicketRegistration.find({ user_id })
        .populate('event_id')
        .populate('user_id', 'fullname');

        if (registrations.length === 0) {
            return res.status(200).json({ message: "No events registered." });
        }

        const eventsSummary = registrations.map(reg => ({
            fullname:reg.user_id.fullname,
            eventTitle: reg.event_id.title,
            eventDescription: reg.event_id.description,
            eventLocation: reg.event_id.location,
            eventStartTime: reg.event_id.start_time,
            eventEndTime: reg.event_id.end_time,
            registrationType: reg.registration_type,
            ticketNumber:reg.ticket_number,
            status: reg.status,
            ticketType: reg.ticket_type,
            eventDate: reg.event_date,
            price: reg.price ? reg.price.toString() : 'Free',
            qrCode: reg.qr_code,
            refundStatus: reg.refund_status,
            expirationDate: reg.expiration_date,
            registrationTime: reg.registration_time
        }));

        res.status(200).json(eventsSummary);
    } catch (error) {
        console.error('Error in fetching registered events: ', error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const updateEvent = async(req,res)=>{
    try {
        const { eventId } = req.params;
        const eventUpdates = req.body;

        // Find and update the event
        const updatedEvent = await Event.findByIdAndUpdate(eventId, eventUpdates, { new: true });

        if (!updatedEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Find all registrations for the event
        const registrations = await TicketRegistration.find({ event_id: eventId }).populate('user_id');

        const notifications = registrations.map(registration => ({
            user_id: registration.user_id._id,
            event_id: eventId,
            message: `The event "${updatedEvent.title}" has been updated.`,
            sent_at: new Date(),
            is_read:false
        }));

        // Save all notifications
        await Notification.insertMany(notifications);
        
        // Send email notifications to users
        const emailPromises = registrations.map(registration => {
            const mailOptions = {
                to: registration.user_id.email,
                from: process.env.EMAIL_USER,
                subject: 'Event Update Notification',
                text: `Hello ${registration.user_id.fullname},\n\n` +
                      `The event "${updatedEvent.title}" you are registered for has been updated.\n\n` +
                      `Please visit the event page for the latest details.\n\n` +
                      `Thank you,\nEvent Management Team`
            };

            return transporter.sendMail(mailOptions);
        });

        await Promise.all(emailPromises);

        res.status(200).json({
            message: 'Event updated and notifications sent successfully',
            event: updatedEvent
        });
    } catch (error) {
        console.error('Error updating event:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

const TicketReg = async(req, res) => {
    try {
        const { event_id, user_id, registration_type, ticket_type } = req.body;

        // Fetch event and user details
        const event = await Event.findById(event_id);
        const user = await User.findById(user_id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate ticket number for ticket purchases using CryptoJS
        let ticketNumber = null;
        if (registration_type === 'ticket') {
            ticketNumber = CryptoJS.lib.WordArray.random(4).toString(CryptoJS.enc.Hex).toUpperCase();
        }

        // Generate QR Code
        let qrCode = null;
        if (ticketNumber) {
            qrCode = await QRCode.toDataURL(ticketNumber);
        }

        // Calculate expiration date (if applicable)
        const expirationDate = event.end_time;

        // Create the registration record
        const registration = new TicketRegistration({
            event_id,
            user_id,
            registration_type,
            ticket_number: ticketNumber,
            status: 'issued',
            price: event.is_paid ? event.ticket_price : null,
            ticket_type: ticket_type || null,
            qr_code: qrCode,
            event_date: parseTimeToDate(event.start_time),
            expiration_date: parseTimeToDate(expirationDate)
        });

        await registration.save();

        // Update current_attendees in the event
        event.current_attendees += 1;
        await event.save();

        // Return the registration details along with event and user info
        const registrationDetails = await TicketRegistration.findById(registration._id)
            .populate('event_id')
            .populate('user_id');

        return res.status(201).json({
            message: 'Registration successful',
            registration: registrationDetails
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
}


module.exports = {
    updateEvent,
    allEvents,
    AllTicketAndRegistration,
    createEvent,
    TicketReg
}