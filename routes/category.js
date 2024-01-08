const Category = require("../models/Category");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const verifyJWT = require("../middleware/verifyJWT");

const upload = multer();

router.use(verifyJWT);

router.post("/newCategory", upload.none(), async (req, res) => {
  try {
    const { categoryName } = req.body;
    const createdBy = req.user._id;

    const existingCategoryWithSameName = await Category.findOne({
      createdBy: createdBy,
      categoryName: categoryName,
    });
    if (existingCategoryWithSameName) {
      return res.status(400).json({
        status: "error",
        message: "Bu kategori adına sahip bir kategori zaten var.",
      });
    }

    const newCategory = new Category({
      categoryName,
      createdBy,
    });

    const data = await newCategory.save();

    res
      .status(201)
      .json({ status: "success", message: "Kategori oluşturuldu", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

router.get("/getCategories", upload.none(), async (req, res) => {
  try {
    const categories = await Category.find({ createdBy: req.user._id }).lean();

    categories.sort((a, b) => {
      return a.categoryName.localeCompare(b.categoryName, "tr", {
        sensitivity: "base",
      });
    });

    if (!categories) {
      return res.status(400).json({
        status: "error",
        message: "Bu kullaniciya ait bir kategori bulunamadi",
      });
    }

    res.status(200).json({ status: "success", categories });
  } catch (error) {
    res.status(500).json({ status: "error", message: error });
  }
});

router.post("/updateCategory", upload.none(), async (req, res) => {
  const updateData = req.body;
  const createdBy = req.user._id;

  try {
    const existingCategoryWithSameName = await Category.findOne({
      createdBy: createdBy,
      categoryName: updateData.categoryName,
    });
    if (existingCategoryWithSameName) {
      return res.status(400).json({
        status: "error",
        message: "Bu kategori adına sahip bir kategori zaten var.",
      });
    }

    const data = await Category.findByIdAndUpdate(updateData._id, updateData, {
      new: true,
    });

    if (!data) {
      return res
        .status(400)
        .json({ status: "error", message: "Boyle bir kategori bulunamadi" });
    }

    res
      .status(200)
      .json({ status: "success", message: "Kategori güncellendi", data });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/deleteCategory", upload.none(), async (req, res) => {
  try {
    const { _id } = req.body;
    const category = await Category.findByIdAndDelete(_id);

    if (!category) {
      return res
        .status(400)
        .json({ status: "error", message: "Böyle bir kategori bulunamadı" });
    }

    res.status(200).json({ status: "success", message: "Kategori silindi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Bir hata oluştu." });
  }
});

module.exports = router;
