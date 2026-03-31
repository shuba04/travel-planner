const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const adminRoutes = require('./routes/admin');   

const app = express();

const checklistRoutes = require("./routes/checklist");

// MIDDLEWARES
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// SESSIONS
app.use(
  session({
    secret: 'travel-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
  })
);

// HOME PAGE (LANDING PAGE)

app.get("/", (req, res) => {
  res.render("home");
});

// ROUTES
app.use('/', require('./routes/auth'));
app.use('/trips', require('./routes/trip'));
app.use('/checklist', checklistRoutes);
app.use('/admin', adminRoutes);



// DATABASE + SERVER START

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
});
  })
  .catch((err) => console.log("❌ DB Connection Error:", err));
