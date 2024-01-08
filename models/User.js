const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
  },
  userImage: {
    type: String,
    required: false,
  },
  kdvPercent: {
    type: Number,
    default: 20,
  },
  roles: [
    {
      type: String,
      default: "Employee",
    },
  ],
  active: {
    type: Boolean,
    default: true,
  },
  documentCounter: {
    type: Number,
    default: 0,
  },
  registrationDate: {
    type: Date,
    default: Date.now, // Kayıt tarihini otomatik olarak ayarlar
  },
  accessExpiration: {
    type: Date,
  },
});

module.exports = mongoose.model("User", userSchema);
