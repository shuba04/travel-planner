const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Trip = require("../models/Trip");
const User = require("../models/User");
const axios = require("axios");

const currencyMap = {
  in: "INR",
  us: "USD",
  gb: "GBP",
  jp: "JPY",
  ca: "CAD",
  au: "AUD",
  ae: "AED",
  fr: "EUR",
  de: "EUR",
  it: "EUR",
  es: "EUR"
};


const PACKING_TEMPLATES = {
  Essentials: ["Backpack","Blanket", "Books" ,"Towels" , "Cash", "Wallet", "Credit adnd Debit cards", "Driver's License", "ID", "Keys", "Tickets", "Passport", "Pen", "Pillow", "Notebook", "Waterbottle"],
  Accessories: ["Sunglasses", "Hat", "Watch", "Scarf", "Bag", "Batteries", "Beach bag", "Bracelets", "Earrings", "Glasses", "Hairties", "Headbands", "jewellery", "Necklaces", "Rings" ],
  Beach: ["Bathing suit", "Beachbag", "Beach towel", "Flipflops", "Goggles", "Hat", "Sunscreen", "Towel"],
  Riding: ["Keys", "Riding Shoes", "Riding Wears", "Gloves", "Helmet", "Scarf"],
  Camping: ["Airbed", "Blanket", "Boots", "Chairs", "Firewood", "Fuel", "Hammer", "Headlamp", "Ice", "Kettle", "Knife", "Match box", "Pillow", "Rope", "Stove", "Table", "Tent", "Toiletries", "Torch", "Towel", "Water container" ],
  Clothing: ["Bathing suit", "Belt", "Boots", "Coat", "Dress", "Flipflops", "Shoes", "Gloves", "Hat", "Heels", "Hoodie", "Jacket", "Jeans", "Jumper suits", "Leggings", "Pajamas", "Rain Jacket", "Sandals", "Scarf", "Shirt", "Skirts", "Slippers", "Sneakers", "Socks", "Sweatshirt", "T-shirts"],
  Electronics: ["Camera", "Camera charger", "Headphones", "Power bank", "Smart phone", "Smart phone charger", "Speaker", "Tab", "Travel adaptor", "Watch", "Watch charger"],
  Food: ["Bread", "Butter", "Cereal", "Cheese", "Chips", "Cookies", "Fruits", "Gum", "Honey", "Ice containers", "Ice", "Juice", "Ketchups", "Mayo", "Milk", "Nuts", "Peanut Butter", "Water", "Yoghurt"],
  Gym: ["Gym Shoes", "Gym wears", "Gym socks", "Gym Towel", "Headphones", "Music Player", "Water bottle"],
  Healthcare: ["Allergy medicine", "Antibiotics", "Eye drops", "First Aid Kit", "Headache pills", "Inhalers", "Nasal spray", "Prescribed medicines"],
  Hiking: ["Bug Repellent", "Compass", "First Aid Kit", "GPS", "Hiking Shoes", "Hiking Socks", "Hiking T-shirts", "Sunglasses", "Sunscreen", "Water bottle"],
  Makeup: ["Blush", "Blush brush", "Brow pencil", "Brushes", "Concealer", "Eyebrow gel", "Eyebrow pencil", "Eyelash", "Eyeliner", "Foundation", "Highlighter", "Lip gloss", "Lip liner", "Lipstick", "Mascara", "Moisturizer", "Perfume", "powder", "Primer", "Setting spray", "sponge"],
  Photography: ["Camera", "camera bag", "camera charger", "Tripod", "Memory Card"],
  Swimming: ["earplugs", "Goggles" , "Swimsuit", "Goggles", "Towel"],
  Toiletries: ["Body wash", "body lotion", "brush", "comb", "Conditioner", "Deodrant", "Facewash", "Glasses", "Hairbrush", "Hair ties", "Hair spray", "Moisturizer", "Perfume", "Shampoo", "Shower gel", "Soap", "Sunscreen", "Toothbrush", "Toothpaste", "Towel"],
  Work: ["Laptop", "Laptop charger", "Smartphone", "Smart phone charger", ]
};

const TASK_TEMPLATES = {
  "Trip Ready": [
    "Create packing list",
    "Confirm accommodation bookings",
    "Check weather & adjust packing",
    "Pack bags",
    "Plan budget & daily expenses",
    "Organize travel documents",
    "Clean house",
    "Arrange pet/house care",
    "Charge electronics / buy adapters"
  ],
  "Before Leaving Home": [
    "Take out trash & leftovers",
    "Unplug appliances",
    "Turn off gas and water",
    "Pack travel snacks",
    "Double‑check personal item bag",
    "Carry final documents & tickets",
    "Check vehicle (fuel, tires, etc.) if driving"
  ]
};

// AUTH MIDDLEWARE
function auth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ADD TRIP PAGE (GET)
router.get("/add", auth, (req, res) => {
  res.render("addTrip", { trip: null });
});

// ADD TRIP (POST)

router.post("/add", auth, async (req, res) => {
  const {
    destination,
    startDate,
    endDate,
    budget,
    travelType,
    travel,
    stay,
    food,
    activities,
    packingCategory,
    taskCategory
  } = req.body;

  //  CHECK DATE OVERLAP
const newStart = new Date(startDate);
const newEnd = new Date(endDate);

const overlappingTrip = await Trip.findOne({
  userId: req.session.userId,
  startDate: { $lte: newEnd },
  endDate: { $gte: newStart }
});

if (overlappingTrip) {
  return res.render("addTrip", {
    error: "Trip dates overlap with an existing trip!",
    trip: req.body
  });
}                

  try {
    console.log("Budget from form:", budget);
// DATE VALIDATION
if(!startDate || !endDate) {
  return res.send("Start and End dates are required");
}
const today = new Date();
today.setHours(0,0,0,0);

const start = new Date(startDate);
const end = new Date(endDate);

if (start < today) {
  return res.send("Start date cannot be in the past");
}

if (end < start) {
  return res.send("End date cannot be before start date")
}
// Clean budget value
const cleanBudget = Number((budget || "0").replace(/,/g, ""));

    // EXPENSE BREAKDOWN
    const expenses = {
      travel: Number(travel) || 0,
      stay: Number(stay) || 0,
      food: Number(food) || 0,
      activities: Number(activities) || 0
    };

    const totalExpense =
      expenses.travel +
      expenses.stay +
      expenses.food +
      expenses.activities;

    const remaining = cleanBudget - totalExpense;

    // Trip duration (in days)
    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );

// Normalize checkbox values to always be arrays
const packArray = Array.isArray(req.body.packingCategory)
  ? req.body.packingCategory
  : req.body.packingCategory
    ? [req.body.packingCategory]
    : [];

const taskArray = Array.isArray(req.body.taskCategory)
  ? req.body.taskCategory
  : req.body.taskCategory
    ? [req.body.taskCategory]
    : [];
let checklistItems = [];
// manual checklist items
const manualItems = Array.isArray(req.body.checklist)
  ? req.body.checklist
  : req.body.checklist
    ? [req.body.checklist]
    : [];

manualItems.forEach(item => {
  if (item && item.trim() !== "") {
    checklistItems.push({
      item,
      completed: false
    });
  }
});

// Add packing template items
packArray.forEach(cat => {
  if (PACKING_TEMPLATES[cat]) {
    checklistItems.push(
      ...PACKING_TEMPLATES[cat].map(item => ({
        item,
        completed: false
      }))
    );
  }
});

// Add task template items
taskArray.forEach(cat => {
  if (TASK_TEMPLATES[cat]) {
    checklistItems.push(
      ...TASK_TEMPLATES[cat].map(item => ({
        item,
        completed: false
      }))
    );
  }
});


// ITINERARY DATA

const { itinerary = [], itineraryDates = [] } = req.body;

const itineraryData = itinerary.map((plan, index) => ({
  day: index + 1,
  date: itineraryDates[index],
  plan
}));

let latitude;
let longitude;
let currency = "INR";

try {
  console.log("API KEY:", process.env.GEOAPIFY_API_KEY);
  
  const geoRes = await axios.get("https://api.geoapify.com/v1/geocode/search", {
    params: {
      text: destination,
      apiKey: process.env.GEOAPIFY_API_KEY
    }
  });

  

if (geoRes.data.features.length > 0) {
  const place = geoRes.data.features[0].properties;

  console.log("Place properties:", place);

  latitude = place.lat;
  longitude = place.lon;

  const countryCode = place.country_code?.toLowerCase();

  currency = currencyMap[countryCode] || "USD";
}
  console.log("Geo response:", geoRes.data);
  console.log("Latitude:", latitude);
  console.log("Longitude:", longitude);

} catch (error) {
  console.error("Geoapify error:", error.message);
}

const newTrip = new Trip({
  userId: req.session.userId,
  destination,
  location: {
  lat: latitude,
  lon: longitude,
},
  currency,
  startDate: newStart,
  endDate: newEnd,
  budget: cleanBudget,
  travelType,
  expenses,
  totalExpense,
  remaining,
  days,
  checklist: checklistItems,
  itinerary: itineraryData,
  packingCategory: packArray,
  taskCategory: taskArray
});


    await newTrip.save();
    res.redirect("/trips");

  } catch (err) {
    console.log(err);
    res.send("Error adding trip");
  }
});

// DASHBOARD + FILTERS

router.get("/", auth, async (req, res) => {
  try {
    const search = req.query.search || "";
    const type = req.query.type || "";
    const from = req.query.from || "";
    const to = req.query.to || "";
    const max = req.query.max || "";

    let filter = { userId: req.session.userId };

    if (search) {
      filter.destination = { $regex: search, $options: "i" };
    }

    if (type) {
      filter.travelType = type;
    }

    if (from && to) {
      filter.startDate = { $gte: new Date(from) };
      filter.endDate = { $lte: new Date(to) };
    }

    if (max) {
      filter.budget = { $lte: Number(max) };
    }


    const trips = await Trip.find(filter).sort({ startDate: 1 });
    const user = await User.findById(req.session.userId);

    res.render("dashboard", {
      user,
      trips,
      search,
      type,
      from,
      to,
      max
    });

  } catch (err) {
    console.log(err);
    res.send("Error loading dashboard");
  }
});

// EDIT TRIP PAGE
router.get("/edit/:id", auth, async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  res.render("addTrip", { trip });
});

// UPDATE TRIP (POST)
router.post("/edit/:id", auth, async (req, res) => {

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.redirect("/trips");
  }

  const {
    destination,
    startDate,
    endDate,
    budget,
    travelType,
    travel,
    stay,
    food,
    activities
  } = req.body;

  // CHECK DATE OVERLAP  
const newStart = new Date(startDate);
const newEnd = new Date(endDate);

console.log("New Start:", newStart);
console.log("New End:", newEnd);

const allTrips = await Trip.find({ userId: req.session.userId });
console.log("All trips in DB:", allTrips);

const overlappingTrip = await Trip.findOne({
  userId: req.session.userId,
  _id: { $ne: req.params.id },
  startDate: { $lte: newEnd },
  endDate: { $gte: newStart }
});

if (overlappingTrip) {
  const trip = await Trip.findById(req.params.id);

  return res.render("addTrip", {
    trip,
    error: "Trip dates overlap with an existing trip!"
  });
}

// DATE VALIDATION
if(!startDate || !endDate) {
  return res.send("Start and End dates are required");
}
const today = new Date();
today.setHours(0,0,0,0);

const start = new Date(startDate);
const end = new Date(endDate);

if (start < today) {
  return res.send("Start date cannot be in the past");
}

if (end < start) {
  return res.send("End date cannot be before start date")
}


// ITINERARY DATA
const { itinerary = [], itineraryDates = [] } = req.body;

const itineraryData = itinerary.map((plan, index) => ({
  day: index + 1,
  date: itineraryDates[index],
  plan
}));

  const formattedDestination =
  destination.charAt(0).toUpperCase() +
  destination.slice(1).toLowerCase();


  const expenses = {
    travel: Number(travel) || 0,
    stay: Number(stay) || 0,
    food: Number(food) || 0,
    activities: Number(activities) || 0
  };

  const totalExpense =
    expenses.travel +
    expenses.stay +
    expenses.food +
    expenses.activities;

  const cleanBudget = Number((budget || "0").replace(/,/g, ""));
  const remaining = cleanBudget - totalExpense;

  //  Trip duration (in days)
  const days = Math.ceil(
    (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
  );

 // Normalize selected checklist items
const selectedItems = Array.isArray(req.body.selectedItems)
  ? req.body.selectedItems
  : req.body.selectedItems
    ? [req.body.selectedItems]
    : [];
const newItems = Array.isArray(req.body.checklist)
  ? req.body.checklist
  : req.body.checklist
    ? [req.body.checklist]
    : [];
// Normalize packing categories
const packArray = Array.isArray(req.body.packingCategory)
  ? req.body.packingCategory
  : req.body.packingCategory
    ? [req.body.packingCategory]
    : [];

// Normalize task categories
const taskArray = Array.isArray(req.body.taskCategory)
  ? req.body.taskCategory
  : req.body.taskCategory
    ? [req.body.taskCategory]
    : [];

// Get template items again
let templateItems = [];

packArray.forEach(cat => {
  if (PACKING_TEMPLATES[cat]) {
    templateItems.push(...PACKING_TEMPLATES[cat]);
  }
});

taskArray.forEach(cat => {
  if (TASK_TEMPLATES[cat]) {
    templateItems.push(...TASK_TEMPLATES[cat]);
  }
});

// Merge template items + selected items
const allItems = [
  ...templateItems,
  ...(Array.isArray(selectedItems) ? selectedItems : [selectedItems])
];

// Remove duplicates
const uniqueItems = [...new Set(allItems)];

// get existing trip
const existingTrip = await Trip.findById(req.params.id);

let finalChecklist = existingTrip.checklist || [];

// update completion status
finalChecklist = finalChecklist.map(c => ({
  item: c.item,
  completed: Array.isArray(selectedItems)
    ? selectedItems.includes(c.item)
    : selectedItems === c.item
}));

// add new items (manual + template)
const allNewItems = [...uniqueItems, ...newItems];

allNewItems.forEach(item => {
  if (item && item.trim() !== "" && !finalChecklist.find(c => c.item === item)) {
    finalChecklist.push({
      item,
      completed: false
    });
  }
});
const updatedTrip = await Trip.findOneAndUpdate(
  {
    _id: req.params.id,
    userId: req.session.userId
  },
  {
    destination: formattedDestination,
    location: {                           
      lat: req.body.lat ? Number(req.body.lat) : undefined,
      lon: req.body.lon ? Number(req.body.lon) : undefined
    },
    startDate: newStart,
    endDate: newEnd,
    budget: cleanBudget,
    travelType,
    expenses,
    totalExpense,
    remaining,
    days,
    checklist: finalChecklist,
    itinerary: itineraryData,
    packingCategory: packArray,
    taskCategory: taskArray
  },
  { new: true }
);

if (!updatedTrip) {
  console.log("Trip not found or not updated");
}

  res.redirect("/trips");
});

// DELETE TRIP

router.get("/delete/:id", auth, async (req, res) => {
  await Trip.findByIdAndDelete(req.params.id);
  res.redirect("/trips");
});

// UPDATE CHECKLIST ITEM (NO REFRESH)
router.get("/checklist/:tripId/toggle/:itemIndex", auth, async (req, res) => {
  try {
    const { tripId, itemIndex } = req.params;

    const trip = await Trip.findById(tripId);

    // Toggle completed true/false
    trip.checklist[itemIndex].completed =
      !trip.checklist[itemIndex].completed;

    await trip.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// DELETE CHECKLIST ITEM (AJAX)
router.get("/checklist/:tripId/delete/:itemIndex", auth, async (req, res) => {
  try {
    const { tripId, itemIndex } = req.params;

    const trip = await Trip.findById(tripId);

    // Remove item from checklist array
    trip.checklist.splice(itemIndex, 1);

    await trip.save();

    res.json({ success: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

// VIEW SINGLE TRIP DETAILS
router.get("/:id", auth, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    console.log("Trip location:", trip.location);

    if (!trip) return res.redirect("/trips");

    let attractions = [];
    let hotels = [];
    let restaurants = [];
    let hospitals = [];

    if (trip.location?.lat && trip.location?.lon) {
      const { lat, lon } = trip.location;

      // Tourist Attractions
      const attractionsRes = await axios.get(
        "https://api.geoapify.com/v2/places",
        {
          params: {
            categories: "tourism.sights",
            filter: `circle:${lon},${lat},20000`,
            limit: 12,
            apiKey: process.env.GEOAPIFY_API_KEY
          }
        }
      );

      attractions = attractionsRes.data.features;

      // Hotels
      const hotelsRes = await axios.get(
        "https://api.geoapify.com/v2/places",
        {
          params: {
            categories: "accommodation.hotel",
            filter: `circle:${lon},${lat},20000`,
            limit: 12,
            apiKey: process.env.GEOAPIFY_API_KEY
          }
        }
      );

      hotels = hotelsRes.data.features.filter(
        place => place.properties.name &&
                !place.properties.name.includes(",")
      );

      // Restaurants
      const restaurantsRes = await axios.get(
        "https://api.geoapify.com/v2/places",
        {
          params: {
            categories: "catering.restaurant",
            filter: `circle:${lon},${lat},20000`,
            limit: 12,
            apiKey: process.env.GEOAPIFY_API_KEY
          }
        }
      );

      restaurants = restaurantsRes.data.features;
      // Hospitals
const hospitalsRes = await axios.get(
  "https://api.geoapify.com/v2/places",
  {
    params: {
      categories: "healthcare.hospital",
      filter: `circle:${lon},${lat},20000`,
      limit: 10,
      apiKey: process.env.GEOAPIFY_API_KEY
    }
  }
);

hospitals = hospitalsRes.data.features;
    }

    res.render("tripDetails", {
      trip,
      attractions,
      hotels,
      restaurants,
      hospitals
    });

  } catch (err) {
    console.log(err);
    res.send("Error loading trip details");
  }
});

// ADD CHECKLIST ITEM
router.post("/checklist/:tripId/add", async (req, res) => {
  try {
    const { tripId } = req.params;
    const { item } = req.body;

    const trip = await Trip.findById(tripId);

    if (!trip) return res.redirect("/trips");

    // add new item
    trip.checklist.push({
      item,
      completed: false
    });

    await trip.save();

    res.redirect("/trips");

  } catch (err) {
    console.log(err);
    res.send("Error adding checklist item");
  }
});

module.exports = router;
