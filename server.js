const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
dotenv.config();

const port = process.env.PORT || 5000;
const logger = require("morgan");

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.log(error);
  }
};

const userRouter = require("./routes/userRoutes.js");
const orderRouter = require("./routes/order.js");
const productRouter = require("./routes/product.js");
const incomingProducts = require("./routes/incomingProduct.js");
const outgoingProducts = require("./routes/outgoingProduct.js");
const authRouter = require("./routes/AuthRoute.js");
const categoryRouter = require("./routes/category.js");
const virtualIncomingDocRouter = require("./routes/virtualIncomingDoc.js");
const virtualOutgoingDocRouter = require("./routes/virtualOutgoingDoc.js");

app.use(cookieParser());
app.use(logger("dev"));
app.use(express.json({ limit: "10mb" }));

app.use(cors());

app.use(
  "/api",
  userRouter,
  orderRouter,
  productRouter,
  incomingProducts,
  outgoingProducts,
  categoryRouter,
  virtualIncomingDocRouter,
  virtualOutgoingDocRouter
);
app.use("/auth", authRouter);

app.listen(port, () => {
  connect();
  console.log(`Server is running on port ${port}`);
});
