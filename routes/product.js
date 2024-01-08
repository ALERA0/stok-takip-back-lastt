const Product = require("../models/Product.js");
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Category = require("../models/Category.js");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "path/to/your/upload/directory");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB limit
  },
});
const verifyJWT = require("../middleware/verifyJWT");

router.use(verifyJWT);
// yeni ürün ekle

const findOrCreateDefaultCategory = async (createdBy) => {
  const defaultCategory = await Category.findOne({
    categoryName: "Diğer",
    createdBy,
  });

  if (!defaultCategory) {
    const newDefaultCategory = new Category({
      createdBy,
      categoryName: "Diğer",
    });

    return newDefaultCategory.save();
  } else {
    return defaultCategory;
  }
};

router.post("/addProduct", async (req, res) => {
  try {
    const {
      productCode,
      productName,
      productListPrice,
      productPackageType,
      productDescription,
      productBarcode,
      productAddress,
      productImage,
      category,
      productKDVPercent,
    } = req.body;

    const createdBy = req.user._id;

    if (!productCode || !productName) {
      return res.status(400).json({
        status: "error",
        message: "Yildizla belirtilen alanlar doldurulmalidir",
      });
    }

    // Fiyat ve Adet'i sayı olarak doğrula
    if (isNaN(productListPrice)) {
      return res.status(400).json({
        status: "error",
        message: "Fiyat sadece sayı olmalıdır",
      });
    }

    // productCode ve productBarcode benzersiz olmalı
    const existingProduct = await Product.findOne({
      $and: [{ $or: [{ productCode }, { productBarcode }] }, { createdBy }],
    });

    if (existingProduct) {
      return res.status(400).json({
        status: "error",
        message: "Bu ürün kodu veya barkodu zaten kullanılıyor",
      });
    }

    let categoryId = null;

    if (!category) {
      const defaultCategory = await findOrCreateDefaultCategory(createdBy);
      categoryId = defaultCategory._id;
    } else {
      categoryId = category;
    }
    const newProduct = new Product({
      createdBy,
      productCode,
      productName,
      productListPrice,
      productPackageType,
      productDescription,
      productBarcode,
      productAddress,
      productImage,
      productKDVPercent,
      category: categoryId, // Kategori ID'sini kullan
    });

    const product = await newProduct.save();
    res
      .status(201)
      .json({ status: "success", message: "Ürün oluşturuldu", product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Kategoriye gore urun getir
router.post("/getProductsByCategory", upload.none(), async (req, res) => {
  try {
    const { categoryId } = req.body;

    const existingCategory = await Category.findById(categoryId);
    if (!existingCategory) {
      return res
        .status(400)
        .json({ status: "error", message: "Böyle bir kategori bulunamadı" });
    }

    const productsInCategory = await Product.find({ category: categoryId })
      .populate("category")
      .lean();

    if (productsInCategory.length === 0) {
      return res.status(200).json({
        status: "success",
        message: "Böyle bir kategoriye ait ürün bulunamadı",
      });
    }

    res.status(200).json({ status: "success", productsInCategory });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Bütün ürünleri getir
router.get("/getAllProducts", async (req, res) => {
  try {
    const products = await Product.find({ createdBy: req.user._id })
      .populate("category", "categoryName")
      .lean();
    res.status(200).json({
      status: "success",
      message: "Ürünler başarıyla getirildi",
      products,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Ürün güncelleme
router.post("/productUpdate", upload.none(), async (req, res) => {
  const updateData = req.body;
  const userId = req.user._id;

  try {
    // Fiyat ve Adet'i sayı olarak doğrula

    if (
      !updateData.productCode &&
      !updateData.productName 
    ) {
      return res.status(400).json({
        status: "error",
        message: "Yildizla belirtilen alanlar doldurulmalidir",
      });
    }

    if (
      (updateData.productListPrice && isNaN(updateData.productListPrice))
    ) {
      return res.status(400).json({
        status: "error",
        message: "Fiyat sadece sayı olmalıdır",
      });
    }

    // Güncellenen ürünü ve sahibini kontrol et
    const existingProduct = await Product.findOne({
      $and: [
        {
          $or: [
            { productCode: updateData.productCode },
            { productBarcode: updateData.productBarcode },
          ],
        },
        { createdBy: userId }, // Sadece aynı kullanıcıya ait ürünleri kontrol et
        { _id: { $ne: updateData._id } }, // Güncellenen ürünün dışındaki ürünlerin kontrol edilmesi
      ],
    });

    if (existingProduct) {
      return res.status(400).json({
        status: "error",
        message: "Bu ürün kodu veya barkodu zaten kullanılıyor",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      updateData._id,
      updateData,
      { new: true }
    );
    res
      .status(200)
      .json({ status: "success", message: "Ürün güncellendi", updatedProduct });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Ürün detaylarını getiren endpoint
router.post("/productDetail", upload.none(), async (req, res) => {
  try {
    const { _id } = req.body;
    const product = await Product.findById(_id)
      .populate("category", "categoryName")
      .lean();
    res.status(200).json({
      status: "success",
      message: "Ürön detayı başarıyla getirildi",
      product,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Ürün silen endpoint
router.post("/productDelete", upload.none(), async (req, res) => {
  try {
    const { _id } = req.body;
    const product = await Product.findByIdAndDelete(_id);
    res.status(200).json({ status: "success", message: "Ürün silindi" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
