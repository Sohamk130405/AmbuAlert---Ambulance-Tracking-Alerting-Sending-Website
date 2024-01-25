const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  phone: {
    type: [Number],
    required: true,
  },

  route: String
});

const Route = new mongoose.model("Route", routeSchema);
module.exports = Route;