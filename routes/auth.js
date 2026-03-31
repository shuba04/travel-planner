const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// REGISTER PAGE (GET)
router.get("/register", (req, res) => {
  res.render("register");
});

// REGISTER USER (POST)
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send("User already exists!");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.redirect("/login");

  } catch (err) {
    console.log(err);
    res.send("Error creating user");
  }
});

// LOGIN PAGE (GET)
router.get("/login", (req, res) => {
  res.render("login");
});

// LOGIN USER (POST)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.send("User not found!");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Wrong password!");

    req.session.userId = user._id;
    res.redirect("/trips");

  } catch (err) {
    console.log(err);
    res.send("Login error");
  }
});

// LOGOUT
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
