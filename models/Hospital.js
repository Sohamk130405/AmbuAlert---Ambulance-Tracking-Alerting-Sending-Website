const mongoose = require("mongoose");

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  phone: {
    type: Number,
    required: true,
  },

  route: [String]
});

const Hospital = new mongoose.model("Hospital", hospitalSchema);
module.exports = Hospital;