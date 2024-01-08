const mongoose = require("mongoose");

const OutcomingProductSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Referans olarak kullanıcının ObjectId'sini saklayacağız
    documentDate: {
      type: Date,
      default: Date.now,
    },
    documentNumber: { type: String, required: true },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      require: false,
    },
    ozellik: { type: Number, default: 0 },
    description: { type: String, required: false },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          require: false,
        },
        quantity: { type: Number, required: true, default: 0 },
        productSalesPrice: { type: Number, required: true, default: 0 },
        includeKDV: { type: Boolean, default: true },
        kdvPercent: { type: Number, default: 20 },
      },
    ],
    subTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    generalTotal: { type: Number, default: 0 },
    quantityTotal: { type: Number, default: 0 },
    kdvTotal20: { type: Number, default: 0 },
    kdvTotal18: { type: Number, default: 0 },
    kdvTotal10: { type: Number, default: 0 },
    kdvTotal8: { type: Number, default: 0 },
    kdvTotal1: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Tarih alanını yyyy-mm-dd formatına dönüştürme
OutcomingProductSchema.set("toJSON", {
  transform: function (doc, ret) {
    ret.documentDate = ret.documentDate.toISOString().split("T")[0];
    return ret;
  },
});

const OutgoingProduct = mongoose.model(
  "OutcomingProduct",
  OutcomingProductSchema
);

module.exports = OutgoingProduct;
