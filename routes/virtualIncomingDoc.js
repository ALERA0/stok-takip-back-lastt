const VirtualIncomingDoc = require("../models/VirtualIncomingDoc");
const express = require("express");
const app = express();
const router = express.Router();
const multer = require("multer");
const Product = require("../models/Product.js");
const upload = multer();
const mongoose = require("mongoose");
const Counter = require("../models/Counter.js");
app.use(express.json());
const verifyJWT = require("../middleware/verifyJWT");
const User = require("../models/User.js");

router.use(verifyJWT);

//Geçici Ürün girş belgesi oluşturma
router.post("/addVirtualIncomingDoc", upload.none(), async (req, res) => {
  try {
    const createdBy = req.user._id;

    const incomingDoc = new VirtualIncomingDoc({ createdBy });
    await incomingDoc.save();
    res.status(200).json({
      status: "success",
      message: "Geçici ürün giriş belgesi başarıyla oluşturuldu.",
      incomingDoc,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Geçici Ürün girş belgesine ürün ekleme
router.post(
  "/addProductToIncomingVirtualDoc",
  upload.none(),
  async (req, res) => {
    try {
      const {
        virtualDocId,
        productId,
        productQuantity,
        productPurchasePrice,
        kdvPercent,
        includeKdv,
      } = req.body;

      const data = await VirtualIncomingDoc.findById(virtualDocId);
      if (!data) {
        return res
          .status(400)
          .json({ status: "error", message: "Belge bulunamadı" });
      }

      const foundProduct = await Product.findById(productId);
      if (!foundProduct) {
        return res
          .status(400)
          .json({ status: "error", message: "Ürün bulunamadı" });
      }

      const productItemExist = data.products.find(
        (p) => p.product.toString() === productId
      );

      if (productItemExist) {
        if (productItemExist.kdvPercent !== kdvPercent) {
          return res.status(400).json({
            status: "error",
            message:
              "Bir belgede aynı üründen farklı KDV oranlarında bulunamaz.",
          });
        }
      }

      const parsedQuantity = parseInt(productQuantity, 10);
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({
          status: "error",
          message: "Ürün eklenemedi lütfen geçerli bir ürün miktarı girin",
        });
      }
      const parsedproductPurchasePrice = parseInt(productPurchasePrice, 10);
      if (
        isNaN(parsedproductPurchasePrice) ||
        parsedproductPurchasePrice <= 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Ürün eklenemedi lütfen geçerli bir alış fiyatı girin",
        });
      }

      data.products.push({
        product: foundProduct._id,
        quantity: parsedQuantity,
        productPurchasePrice: productPurchasePrice,
        includeKDV: includeKdv,
        kdvPercent: kdvPercent,
      });

      // Belge fiyatlarını güncelle
      if (includeKdv) {
        const subAmount = parseFloat(
          (productPurchasePrice / (1 + kdvPercent / 100)).toFixed(3)
        );
        const kdvAmount = parseFloat(
          (productPurchasePrice - subAmount).toFixed(3)
        );
        data.subTotal += parseFloat((subAmount * parsedQuantity).toFixed(3));
        data.taxTotal += parseFloat((kdvAmount * parsedQuantity).toFixed(3));

        if (kdvPercent == 20) {
          data.kdvTotal20 += parseFloat(
            (kdvAmount * parsedQuantity).toFixed(3)
          );
        }
        if (kdvPercent == 18) {
          data.kdvTotal18 += parseFloat(
            (kdvAmount * parsedQuantity).toFixed(3)
          );
        }
        if (kdvPercent == 10) {
          console.log("AAAAAAAAAAAA");
          data.kdvTotal10 += parseFloat(
            (kdvAmount * parsedQuantity).toFixed(3)
          );
        }
        if (kdvPercent == 8) {
          data.kdvTotal8 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
        }
        if (kdvPercent == 1) {
          data.kdvTotal1 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
        }
      } else {
        data.subTotal += parseFloat(
          (productPurchasePrice * parsedQuantity).toFixed(3)
        );
        data.taxTotal += parseFloat(
          (
            ((productPurchasePrice * kdvPercent) / 100) *
            parsedQuantity
          ).toFixed(3)
        );
        if (kdvPercent == 20) {
          data.kdvTotal20 += parseFloat(
            (
              ((productPurchasePrice * kdvPercent) / 100) *
              parsedQuantity
            ).toFixed(3)
          );
        }
        if (kdvPercent == 18) {
          data.kdvTotal18 += parseFloat(
            (
              ((productPurchasePrice * kdvPercent) / 100) *
              parsedQuantity
            ).toFixed(3)
          );
        }
        if (kdvPercent == 10) {
          console.log("AAAAAAAAAAAA");
          data.kdvTotal10 += parseFloat(
            (
              ((productPurchasePrice * kdvPercent) / 100) *
              parsedQuantity
            ).toFixed(3)
          );
        }
        if (kdvPercent == 8) {
          data.kdvTotal8 += parseFloat(
            (
              ((productPurchasePrice * kdvPercent) / 100) *
              parsedQuantity
            ).toFixed(3)
          );
        }
        if (kdvPercent == 1) {
          data.kdvTotal1 += parseFloat(
            (
              ((productPurchasePrice * kdvPercent) / 100) *
              parsedQuantity
            ).toFixed(3)
          );
        }
      }

      data.quantityTotal += parsedQuantity;

      data.subTotal = data.subTotal.toFixed(3);
      data.taxTotal = data.taxTotal.toFixed(3);
      data.kdvTotal20 = data.kdvTotal20.toFixed(3);
      data.kdvTotal18 = data.kdvTotal18.toFixed(3);
      data.kdvTotal10 = data.kdvTotal10.toFixed(3);
      data.kdvTotal8 = data.kdvTotal8.toFixed(3);
      data.kdvTotal1 = data.kdvTotal1.toFixed(3);

      data.generalTotal = (data.subTotal + data.taxTotal).toFixed(3);

      await data.save();

      res.status(200).json({
        status: "success",
        message: "Ürün girişi başarıyla gerçekleştirildi.",
        data,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

//Geçici Ürün girş belgesindeki ürünlerin bilgilerini güncelleme
router.post(
  "/updateIncomingVirtualDocProducts",
  upload.none(),
  async (req, res) => {
    try {
      const {
        virtualDocId,
        productId,
        quantity,
        kdvPercent,
        includeKdv,
        productPurchasePrice,
        productSelfId,
      } = req.body;

      // Mevcut ürün girişini bulma
      const incomingProduct = await VirtualIncomingDoc.findById(virtualDocId);
      if (!incomingProduct) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün giriş belgesi bulunamadı.",
        });
      }

      const productItem = incomingProduct.products.find(
        (p) => p._id.toString() === productId
      );

      if (!productItem) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün bulunamadı.",
        });
      }

      const foundProduct = await Product.findById(productSelfId);
      if (!foundProduct) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün bulunamadı.",
        });
      }

      const existingProduct = incomingProduct.products.find(
        (p) =>
          p.product.toString() === productSelfId &&
          p._id.toString() !== productId &&
          p.kdvPercent !== kdvPercent
      );

      if (existingProduct) {
        return res.status(400).json({
          status: "error",
          message:
            "Aynı üründen farklı KDV oranlarıyla birden fazla ürün eklenemez.",
        });
      }

      const parsedNewQuantity = parseInt(quantity, 10);
      if (isNaN(parsedNewQuantity) || parsedNewQuantity < 0) {
        return res.status(400).json({
          status: "error",
          message: "Yeni miktar geçerli bir sayı değil.",
        });
      }
      const parsedNewproductPurchasePrice = parseInt(productPurchasePrice, 10);
      if (
        isNaN(parsedNewproductPurchasePrice) ||
        parsedNewproductPurchasePrice < 0
      ) {
        return res.status(400).json({
          status: "error",
          message: "Yeni alış fiyatı değeri geçerli bir sayı değil.",
        });
      }

      // Önceki değerleri kaydetmek için kullan
      const prevQuantity = productItem.quantity;
      const prevKdvPercent = productItem.kdvPercent;
      const prevIncludeKdv = productItem.includeKDV;
      const prevProductPurchasePrice = productItem.productPurchasePrice;

      // Yeni değerleri güncelle
      productItem.quantity = quantity;
      productItem.kdvPercent = kdvPercent;
      productItem.includeKDV = includeKdv;
      productItem.productPurchasePrice = productPurchasePrice;

      // Önceki ürünün bu belge içindeki toplam değerini çıkar
      let prevSubTotal = 0;
      let prevtaxTotal = 0;

      if (prevIncludeKdv) {
        const prevSubAmount = parseFloat(
          (prevProductPurchasePrice / (1 + prevKdvPercent / 100)).toFixed(3)
        );
        const prevKdvAmount = parseFloat(
          (prevProductPurchasePrice - prevSubAmount).toFixed(3)
        );
        prevSubTotal = parseFloat((prevSubAmount * prevQuantity).toFixed(3));
        prevtaxTotal = parseFloat((prevKdvAmount * prevQuantity).toFixed(3));
        if (prevKdvPercent == 20) {
          incomingProduct.kdvTotal20 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 18) {
          incomingProduct.kdvTotal18 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 10) {
          incomingProduct.kdvTotal10 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 8) {
          incomingProduct.kdvTotal8 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 1) {
          incomingProduct.kdvTotal1 -= parseFloat(prevtaxTotal.toFixed(3));
        }
      } else {
        prevSubTotal = parseFloat(
          (prevProductPurchasePrice * prevQuantity).toFixed(3)
        );
        prevtaxTotal = parseFloat(
          (
            prevProductPurchasePrice *
            prevQuantity *
            (prevKdvPercent / 100)
          ).toFixed(3)
        );
        if (prevKdvPercent == 20) {
          incomingProduct.kdvTotal20 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 18) {
          incomingProduct.kdvTotal18 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 10) {
          incomingProduct.kdvTotal10 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 8) {
          incomingProduct.kdvTotal8 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 1) {
          incomingProduct.kdvTotal1 -= parseFloat(prevtaxTotal.toFixed(3));
        }
      }

      // Yeni ürünün bu belge içindeki toplam değerini hesapla
      let newSubTotal = 0;
      let newTaxTotal = 0;

      if (includeKdv) {
        const subAmount = parseFloat(
          (productPurchasePrice / (1 + kdvPercent / 100)).toFixed(3)
        );
        const kdvAmount = parseFloat(
          (productPurchasePrice - subAmount).toFixed(3)
        );
        newSubTotal = parseFloat((subAmount * quantity).toFixed(3));
        newTaxTotal = parseFloat((kdvAmount * quantity).toFixed(3));
        if (kdvPercent == 20) {
          incomingProduct.kdvTotal20 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 18) {
          incomingProduct.kdvTotal18 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 10) {
          incomingProduct.kdvTotal10 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 8) {
          incomingProduct.kdvTotal8 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 1) {
          incomingProduct.kdvTotal1 += parseFloat(newTaxTotal.toFixed(3));
        }
      } else {
        newSubTotal = parseFloat((productPurchasePrice * quantity).toFixed(3));
        newTaxTotal = parseFloat(
          (productPurchasePrice * quantity * (kdvPercent / 100)).toFixed(3)
        );
        if (kdvPercent == 20) {
          incomingProduct.kdvTotal20 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 18) {
          incomingProduct.kdvTotal18 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 10) {
          incomingProduct.kdvTotal10 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 8) {
          incomingProduct.kdvTotal8 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 1) {
          incomingProduct.kdvTotal1 += parseFloat(newTaxTotal.toFixed(3));
        }
      }

      // Mevcut belge değerlerinden önceki ürünün toplamını çıkar ve yeni ürünün toplamını ekle
      incomingProduct.subTotal -= prevSubTotal;
      incomingProduct.subTotal += newSubTotal;
      incomingProduct.taxTotal -= prevtaxTotal;
      incomingProduct.taxTotal += newTaxTotal;

      incomingProduct.subTotal = incomingProduct.subTotal.toFixed(3);
      incomingProduct.taxTotal = incomingProduct.taxTotal.toFixed(3);
      incomingProduct.kdvTotal20 = incomingProduct.kdvTotal20.toFixed(3);
      incomingProduct.kdvTotal18 = incomingProduct.kdvTotal18.toFixed(3);
      incomingProduct.kdvTotal10 = incomingProduct.kdvTotal10.toFixed(3);
      incomingProduct.kdvTotal8 = incomingProduct.kdvTotal8.toFixed(3);
      incomingProduct.kdvTotal1 = incomingProduct.kdvTotal1.toFixed(3);

      incomingProduct.generalTotal = (
        incomingProduct.subTotal + incomingProduct.taxTotal
      ).toFixed(3);
      incomingProduct.quantityTotal += quantity - prevQuantity;

      await incomingProduct.save();

      res.status(200).json({
        status: "success",
        message: "Ürün girişi başarıyla güncellendi.",
        incomingProduct,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.post(
  "/removeProductfromIncomingvirtualDoc",
  upload.none(),
  async (req, res) => {
    try {
      const { virtualDocId, productId } = req.body;

      // Mevcut ürün girişini bulma
      const incomingProduct = await VirtualIncomingDoc.findById(virtualDocId);
      if (!incomingProduct) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün giriş belgesi bulunamadı",
        });
      }

      // Çıkarılacak ürünü bul ve quantity değerini al
      const productToRemove = incomingProduct.products.find(
        (product) => product._id.toString() === productId
      );

      if (!productToRemove) {
        return res.status(400).json({
          status: "error",
          message: "Çıkarılacak ürün listede bulunamadı",
        });
      }

      const removedQuantity = productToRemove.quantity;

      // Stok kontrolü yap
      const foundProduct = await Product.findById(productToRemove.product);
      if (!foundProduct) {
        return res.status(400).json({
          status: "error",
          message: "Çıkarılacak ürünün veritabanında kaydı bulunamadı",
        });
      }

      // Ürünleri productId değerine göre filtrele ve productIdToRemove değerine sahip olanı çıkart
      incomingProduct.products = incomingProduct.products.filter(
        (product) => product._id.toString() !== productId
      );

      // Belge fiyatlarını güncelle

      let removedSubTotal = 0;
      let removedTaxTotal = 0;

      if (productToRemove.includeKDV) {
        const removedSubAmount = parseFloat(
          (
            productToRemove.productPurchasePrice /
            (1 + productToRemove.kdvPercent / 100)
          ).toFixed(3)
        );
        const removedKdvAmount = parseFloat(
          (productToRemove.productPurchasePrice - removedSubAmount).toFixed(3)
        );
        removedSubTotal += parseFloat(
          (removedSubAmount * removedQuantity).toFixed(3)
        );
        removedTaxTotal += parseFloat(
          (removedKdvAmount * removedQuantity).toFixed(3)
        );
        if (productToRemove.kdvPercent == 20) {
          incomingProduct.kdvTotal20 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 18) {
          incomingProduct.kdvTotal18 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 10) {
          incomingProduct.kdvTotal10 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 8) {
          incomingProduct.kdvTotal8 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 1) {
          incomingProduct.kdvTotal1 -= parseFloat(removedTaxTotal.toFixed(3));
        }
      } else {
        removedSubTotal = parseFloat(
          (productToRemove.productPurchasePrice * removedQuantity).toFixed(3)
        );
        removedTaxTotal = parseFloat(
          (
            ((productToRemove.productPurchasePrice *
              productToRemove.kdvPercent) /
              100) *
            removedQuantity
          ).toFixed(3)
        );
        if (productToRemove.kdvPercent == 20) {
          incomingProduct.kdvTotal20 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 18) {
          incomingProduct.kdvTotal18 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 10) {
          incomingProduct.kdvTotal10 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 8) {
          incomingProduct.kdvTotal8 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 1) {
          incomingProduct.kdvTotal1 -= parseFloat(removedTaxTotal.toFixed(3));
        }
      }

      incomingProduct.subTotal -= removedSubTotal;
      incomingProduct.taxTotal -= removedTaxTotal;
      incomingProduct.quantityTotal -= removedQuantity;

      incomingProduct.subTotal = incomingProduct.subTotal.toFixed(3);
      incomingProduct.taxTotal = incomingProduct.taxTotal.toFixed(3);
      incomingProduct.kdvTotal20 = incomingProduct.kdvTotal20.toFixed(3);
      incomingProduct.kdvTotal18 = incomingProduct.kdvTotal18.toFixed(3);
      incomingProduct.kdvTotal10 = incomingProduct.kdvTotal10.toFixed(3);
      incomingProduct.kdvTotal8 = incomingProduct.kdvTotal8.toFixed(3);
      incomingProduct.kdvTotal1 = incomingProduct.kdvTotal1.toFixed(3);

      incomingProduct.generalTotal = (
        incomingProduct.subTotal + incomingProduct.taxTotal
      ).toFixed(3);

      // incomingProduct'i güncelle
      await incomingProduct.save();

      return res.status(200).json({
        status: "success",
        message: "Ürün başarıyla çıkartıldı.",
        incomingProduct,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  }
);

router.post(
  "/virtualIncomingProductDetail",
  upload.none(),
  async (req, res) => {
    try {
      const { virtualDocId } = req.body;
      const data = await VirtualIncomingDoc.findById(virtualDocId)
        .populate(
          "products.product",
          "productName productCode productDescription productQuantity productImage productPackageType" 
        )
        .populate("order", "_id isim");

      if (!data) {
        return res.status(400).json({
          status: "error",
          message: "Ürün giriş belgesi bulunamadı.",
        });
      }

      res.status(200).json({
        status: "success",
        message: "Ürün giriş belgesi detayı başarıyla getirildi",
        data,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.post("/deleteVirtualIncomingDoc", upload.none(), async (req, res) => {
  try {
    const { virtualDocId } = req.body;
    const data = await VirtualIncomingDoc.findById(virtualDocId);
    if (!data) {
      return res.status(400).json({
        status: "error",
        message: "Geçici ürün girişi bulunamadı.",
      });
    }
    await VirtualIncomingDoc.findByIdAndDelete(virtualDocId);
    res.status(200).json({
      status: "success",
      message: "Geçici ürün giriş belgesi  başarıyla silindi",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
