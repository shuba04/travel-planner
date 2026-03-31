const mongoose = require("mongoose");
const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  destination: {
    type: String,
    required: true
  },

  location: {                  
    lat: { type: Number },
    lon: { type: Number }
  },

  travelType: {
    type: String,
    required: true
  },

  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },

  days: Number,

  budget:{
    type: Number,
    required: true
  },

  currency: {
  type: String,
  default: "INR"
},

  expenses: {
    travel: { type: Number, default: 0 },
    stay: { type: Number, default: 0 },
    food: { type: Number, default: 0 },
    activities: { type: Number, default: 0 }
  },

  totalExpense: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },

  itinerary: [
    {
      day: Number,
      date: String,
      plan: String
    }
  ],

  packingCategory: [String],
  taskCategory: [String],
  
  checklist: [
    {
      item: String,
      completed: { type: Boolean, default: false }
    }
  ]
});

module.exports = mongoose.model("Trip", tripSchema);