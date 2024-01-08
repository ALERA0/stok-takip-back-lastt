const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    tcNumber: { type: String, required: true, length: 11 },
    isim: { type: String, required: true },
    email: { type: String, required: true },
    telefon: { type: Number, required: true },
    il: { type: String, required: false },
    ilce: { type: String, required: false },
    adres: { type: String, required: false },

    ozellik: [{ type: String, enum: ["Tedarikçi", "Müşteri"], required: true }],
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
