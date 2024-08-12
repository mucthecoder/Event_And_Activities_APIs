const { type } = require('express/lib/response');
const mongoose = require('mongoose');
const { Schema } = mongoose;

const eventSchema = new Schema({
  user_id: { 
    type: Schema.Types.ObjectId,
    ref:"User",
    required: true 
  },

  title: { 
    type: String, 
    required: true 
  },

  description: { 
    type: String, 
    required: true 
  },

  location: { 
    type: String, 
    required: true 
  },

  start_time: { 
    type: Date, 
    required: true 
  },

  end_time: { 
    type: Date, 
    required: true 
  },

  is_paid: { 
    type: Boolean, 
    required: true 
  },

  ticket_price: { 
    type: Number,
    default:0
  },

  max_attendees: { 
    type: Number,
  },

  current_attendees: { 
    type: Number, 
    default: 0 
  },

  images: [{
    type: String 
  }],

  category: [{ 
    type:String
    // type: Schema.Types.ObjectId, 
    // ref: 'EventCategory' 
  }]
},{timestamps:true});

module.exports = mongoose.model('Event', eventSchema);
