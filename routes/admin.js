const express = require("express");
const router = express.Router();
const Trip = require("../models/Trip");
const User = require("../models/User");

// ADMIN LOGIN PAGE
router.get("/login", (req, res) => {
  res.render("adminLogin");
});

// ADMIN LOGIN POST
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.admin = true;
    return res.redirect("/admin/dashboard");
  }

  res.send("Invalid Admin Credentials");
});

// MIDDLEWARE — CHECK ADMIN
function isAdmin(req, res, next) {
  if (!req.session.admin) return res.redirect("/admin/login");
  next();
}

// ADMIN DASHBOARD
router.get("/dashboard", isAdmin, async (req, res) => {
  const users = await User.find();
  const trips = await Trip.find().populate("userId");
  
  res.render("adminDashboard", { users, trips });
});

// ADMIN LOGOUT
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// DELETE TRIP
router.post("/delete-trip/:id", isAdmin, async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.log(err);
    res.send("Error deleting trip");
  }
});

// DELETE USER
router.post("/delete-user/:id", isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Delete all trips of that user
    await Trip.deleteMany({ userId: userId });

    res.redirect("/admin/dashboard");
  } catch (err) {
    console.log(err);
    res.send("Error deleting user");
  }
});

module.exports = router;
