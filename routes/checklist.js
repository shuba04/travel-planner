const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");

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



// auth middleware
function auth(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  next();
}

// CHECK TRIP ACTIVE

async function checkTripActive(req, res, next) {
  const trip = await Trip.findById(req.params.tripId);
  if (!trip) return res.redirect("/trips");

  const today = new Date();
  if (trip.endDate < today) {
    return res.redirect("/trips");
  }

  req.trip = trip;
  next();
}

// ADD checklist item
router.post("/:tripId/add", auth, async (req, res) => {
  const { item } = req.body;

  await Trip.findByIdAndUpdate(req.params.tripId, {
    $push: { checklist: { item } }
  });

  res.redirect("/trips");
});

// TOGGLE complete
router.get("/:tripId/toggle/:index", auth, async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);

  trip.checklist[req.params.index].completed =
    !trip.checklist[req.params.index].completed;

  await trip.save();
  res.json({ success: true });

});

// DELETE item
router.get("/:tripId/delete/:index", auth, async (req, res) => {
  const trip = await Trip.findById(req.params.tripId);
  trip.checklist.splice(req.params.index, 1);
  await trip.save();
  res.redirect("/trips");
});

// ADD PRE-MADE LISTS (Packing + Tasks)
router.post("/:tripId/template", auth, async (req, res) => {
  const { type, taskType } = req.body;
  let checklistItems = [];

  // Packing list items
  if (type) {
    const items = PACKING_TEMPLATES[type] || [];
    checklistItems.push(...items.map(item => ({ item, completed: false })));
  }

  // Pre-trip tasks
  if (taskType) {
    const tasks = TASK_TEMPLATES[taskType] || [];
    checklistItems.push(...tasks.map(item => ({ item, completed: false })));
  }

  if (checklistItems.length > 0) {
    await Trip.findByIdAndUpdate(req.params.tripId, {
      $push: { checklist: { $each: checklistItems } }
    });
  }

  res.redirect("/trips");
});


module.exports = router;
