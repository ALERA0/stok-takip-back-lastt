const Order = require("../models/Order.js");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();

const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);

// const existingOrderWithSameTC =  Order.findOne({
//   tcNumber: tcNumber,
//   createdBy: createdBy,
// });
// if (existingOrderWithSameTC) {
//   return res.status(400).json({
//     status: "error",
//     message: "Bu TC numarası ile zaten bir sipariş oluşturulmuş.",
//   });
// }

//Yeni bir
router.post("/newOrder", upload.none(), async (req, res) => {
  try {
    const { tcNumber, isim, email, telefon, il, ilce, adres, ozellik } = req.body;
    const createdBy = req.user._id;

    if (!ozellik || !tcNumber || !isim || !email || !telefon || !il) {
      return res.status(400).json({
        status: "error",
        message: "Yıldızlı alanlar doldurulmalı.",
      });
    }

    if (tcNumber.length !== 11) {
      return res.status(400).json({
        status: "error",
        message: "TC numarası 11 haneli olmalıdır.",
      });
    }

    // Kullanıcının oluşturduğu carilerde TC numarası, e-posta veya telefon kontrolü
    const existingOrderWithSameInfo = await Order.findOne({
      $or: [
        { tcNumber: tcNumber, createdBy: createdBy },
        { email: email, createdBy: createdBy },
        { telefon: telefon, createdBy: createdBy },
      ],
    });

    if (existingOrderWithSameInfo) {
      return res.status(400).json({
        status: "error",
        message: "Bu TC numarası, e-posta veya telefon ile zaten bir cari oluşturulmuş.",
      });
    }

    const order = new Order({
      tcNumber,
      isim,
      email,
      telefon,
      adres,
      ozellik,
      createdBy,
      il,
      ilce,
    });

    const savedOrder = await order.save();
    res.status(201).json({
      status: "success",
      message: "Cari oluşturuldu",
      savedOrder,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});




//Bütün carileri getiren endpoint
router.get("/getLAllOrders", async (req, res) => {
  try {
    const orders = await Order.find({ createdBy: req.user._id }).lean();

    orders.sort((a, b) => {
      return a.isim.localeCompare(b.isim, "tr", { sensitivity: "base" });
    });

    res.status(200).json({ status: "success", orders });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

// Belli bir cariyi id'ye göre getiren endpoint
router.post("/orderDetail", upload.none(), async (req, res) => {
  try {
    const { _id } = req.body;
    const order = await Order.findById(_id);
    res.status(200).json({ status: "success", order });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

//Cari güncelleyen enpoint
router.post("/updateOrder", upload.none(), async (req, res) => {
  const updateData = req.body;
  const createdBy = req.user._id;
  try {
    const existingOrder = await Order.findById(updateData._id);

    if(!existingOrder){
      return res.status(400).json({
        status:"error",
        message:"Boyle bir cari bulunamadi"
      })
    }

    

    if( !updateData.tcNumber || !updateData.isim || !updateData.email || !updateData.telefon ){
      return res.status(400).json({
        status:"error",
        message:"Yildizli alanlar doldurulmalidir"
      })
    }
    

    

    const duplicateTC = await Order.findOne(
      { 
      tcNumber: updateData.tcNumber,
      createdBy: createdBy, }).lean().exec();

    if (duplicateTC && duplicateTC?._id.toString() !== updateData._id) {
      return res.status(409).json({ message: "Bu TC numarası ile zaten başka bir cari bulunmaktadır." });
  }

  if (updateData.tcNumber.length !== 11) {
    console.log(updateData.tcNumber);
    return res.status(400).json({
      status: "error",
      message: "Tc Numarasi 11 haneden olusmalidir.",
    });
  }

  if (updateData.tcNumber.length === 11) {
    console.log(updateData.tcNumber);
    console.log(updateData.tcNumber.length);
    
  }

  const duplicateEmail = await Order.findOne(
    { 
      email: updateData.email,
      createdBy: createdBy,}).lean().exec();

  if (duplicateEmail && duplicateEmail?._id.toString() !== updateData._id) {
    return res.status(409).json({ message: "Bu e-mail ile zaten başka bir cari bulunmaktadır." });
}

const duplicateTel = await Order.findOne(
  { 
    telefon: updateData.telefon,
    createdBy: createdBy,}).lean().exec();

if (duplicateTel && duplicateTel?._id.toString() !== updateData._id) {
  return res.status(409).json({ message: "Bu telefon numarası ile zaten başka bir cari bulunmaktadır." });
}

    const updatedOrder = await Order.findByIdAndUpdate(
      updateData._id,
      updateData,
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Cari başarıyla güncellendi.",
      updatedOrder,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});



router.post("/deleteOrder", upload.none(), async (req, res) => {
  try {
    const { _id } = req.body;
    const order = await Order.findByIdAndDelete(_id);
    res.status(200).json({ status: "success", message: "Cari silindi." });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

router.get("/getTedarikciOrders", async (req, res) => {
  try {
    const orders = await Order.find({
      ozellik: "Tedarikçi",
      createdBy: req.user._id,
    }).lean();

    orders.sort((a, b) => {
      return a.isim.localeCompare(b.isim, "tr", { sensitivity: "base" });
    });

    res.status(200).json({
      status: "success",
      message: "Tedarikçiler Başarıyla getirildi.",
      orders,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

router.get("/getMusteriOrders", async (req, res) => {
  try {
    const orders = await Order.find({
      ozellik: "Müşteri",
      createdBy: req.user._id,
    }).lean();

    orders.sort((a, b) => {
      return a.isim.localeCompare(b.isim, "tr", { sensitivity: "base" });
    });

    res.status(200).json({
      status: "success",
      message: "Müşteriler Başarıyla getirildi.",
      orders,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

module.exports = router;
