const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    productCode: { type: String, required: true },
    productName: { type: String, required: true },
    productKDVPercent: { type: Number, required: false, default: 20 },
    productListPrice: { type: Number, required: false },
    productImage: { type: String, required: false },
    productQuantity: { type: Number, required: false, default: 0 },
    productPackageType: { type: String, required: false },
    productDescription: { type: String, required: false },
    productBarcode: { type: String, required: false },
    productAddress: { type: String, required: false },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
