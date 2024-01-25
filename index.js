const mongoose = require("mongoose");
const express = require("express");
const path = require("path");
const app = express();
const port = 8080;
const User = require("./models/User.js");
const Hospital = require("./models/Hospital.js");
const Route = require("./models/Route.js");
const methodOverride = require("method-override");
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// twilio api
const accountSid = 'AC63cc4507af974073bbef60f622d61eec';
const authToken = 'e3b27a738f7e418c3d3c60d0989c4eb5';
const client = require('twilio')(accountSid, authToken);


main()
  .then((res) => {
    console.log("Connection Successfull");
  })
  .catch((err) => console.log(err));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ambualert");
}

app.listen(port, () => {
  console.log(`the app is listening to the port ${port}`);
});
app.get("/", (req, res) => {
  res.send("Server is working  fine!");
});

// registration route

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      phone,
      password,
      confirmPassword,
      hospitals,
    } = req.body;
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.send(`
        <script>
          alert("Username already exists. Please choose a different username.");
          window.location.href = "/register";
        </script>
      `);
    }

    // Check if the password and confirm password match
    if (password !== confirmPassword) {
      return res.send(`
        <script>
          alert("Passwords do not match");
          window.location.href = "/register";
        </script>
      `);
    }

    // Create a new user document
    const newUser = new User({
      name: name,
      username: username,
      email: email,
      phone: phone,
      password: password,
      hospitals: hospitals, // Assuming 'hospitals' is an array of selected hospitals
    });

    // Save the user to the database
    await newUser.save();

    // Redirect to the login page or any other page
    res.redirect("/login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// login route
app.get("/login", (req, res) => {
  res.render("index", { User });
});

// validation of login

app.post("/login/check", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username });

    // Compare hashed passwords
    if (user && user.password === password) {
      // Successful login
      res.send(`
            <script>
              alert("Login successful");
              window.location.href = "/home/${user._id}"; 
            </script>
          `);
    } else {
      res.send(`
            <script>
              alert("Incorrect username or  password");
              window.location.href = "/login";
            </script>
          `);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send(`
        <script>
          alert("Internal Server Error");
          window.location.href = "/login"; 
        </script>
      `);
  }
});

// home route

app.get("/home/:userId", async (req, res) => {
  let userId = req.params.userId;
  try {
    // Fetch user data from the database using the userId
    const user = await User.findById(userId);
    if (user) {
      res.render("home", { user, userId });
    } else {
      // Handle case where user is not found
      res.status(404).send("User not found");
    }
  } catch (error) {
    // Handle database query error
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// hospital map display route

app.post("/route/:userId", async (req, res) => {
  let { hospital } = req.body;
  let userId = req.params.userId;
  let route = 0;
  let hosMap = await Hospital.find({ name: hospital });
  let newRoute = await hosMap[0].route[route];
  res.render("route", { hosMap, newRoute, userId });
});

// change route
app.patch("/:userId/:hospital/route", async (req, res) => {
  try {
    const { route } = req.body;
    let userId = req.params.userId;
    const hospital = req.params.hospital;
    // Find the hospital by name
    const hosMap = await Hospital.find({ name: hospital });
    // Check if the hospital exists
    if (!hosMap) {
      return res.status(404).send("Hospital not found");
    }

    // Check if 'route' is a valid index in the 'route' array
    if (route < 0 || route >= hosMap[0].route.length) {
      return res.status(400).send("Invalid route index");
    }

    // Get the new route based on the selected index
    const newRoute = hosMap[0].route[route];

    // Render the route view with the new route
    res.render("route", { hosMap, newRoute, userId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// alert route
app.get("/alert/:userId", async (req, res) => {
  try {
    let { newRoute } = req.query;
    let { hosMap } = req.query;
    let userId = req.params.userId;

    // Find the hospital by route
    let hospital = await Route.findOne({ route: newRoute });

    // Find the user by userId
    let user = await User.findOne({ _id: userId });

    // Check if hospital and user exist
    if (!hospital || !user) {
      return res.status(404).send("Hospital or user not found");
    }

    console.log(`Driver: ${user.name}`);
    console.log(`Phone: ${user.phone}`);
    console.log(`Hospital: ${hospital.name}`);
    console.log(`Alert Sent To: ${hospital.phone}`);
    console.log("Live Location : https://maps.app.goo.gl/mhRfUhd6Y12FXQH86");

    client.messages
  .create({
     body: `Driver: ${user.name}\nPhone: ${user.phone}\nHospital: ${hospital.name}\nLive Location : https://maps.app.goo.gl/QtXDHRKLQwiiM8F9A`,
     from: '+12059315725',
     to: '+919359954501'
   })
  .then(message => console.log(message.sid));

    // Render the "alert" view with the newRoute
    res.render("alert", { newRoute, userId , hosMap});



  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



app.patch("/:userId/route/change", async (req, res) => {
  try {
    let userId = req.params.userId;
    const  { hospital }   = req.body;
    // Find the hospital by name
    const hosMap = await Hospital.find({ name: hospital });
    // Check if the hospital exists
    if (!hosMap) {
      return res.status(404).send("Hospital not found");
    }
  
    // Get the new route based on the selected index
    const newRoute = hosMap[0].route[0];

    // Render the route view with the new route

    client.messages
  .create({
     body: 'Driver has changed his route.\nSorry For Inconvinience caused And Thanks For Your Efforts',
     from: '+12059315725',
     to: '+919359954501'
   })
  .then(message => console.log(message.sid));
    res.render("route", { hosMap, newRoute, userId });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



app.get("/exit/:userId", async (req, res) => {
  let userId = req.params.userId;
  let user = await User.findOne({ _id: userId });
  console.log(`Driver ${user.name} reached the destination`);
  console.log("Thanks For Clearing Traffic");
  client.messages
  .create({
     body: 'Thanks For Clearing Traffic.\nAmbulance Reached Hospital',
     from: '+12059315725',
     to: '+919359954501'
   })
  .then(message => console.log(message.sid));
  res.redirect(`/home/${userId}`);
  
});

