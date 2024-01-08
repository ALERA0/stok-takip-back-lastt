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
const VirtualOutgoingDoc = require("../models/VirtualOutgoingDoc");

router.use(verifyJWT);

//Geçici Ürün girş belgesi oluşturma
router.post("/addVirtualOutgoingDoc", upload.none(), async (req, res) => {
  try {
    const createdBy = req.user._id;

    const outgoingDoc = new VirtualOutgoingDoc({ createdBy });
    await outgoingDoc.save();
    res.status(200).json({
      status: "success",
      message: "Geçici ürün giriş belgesi başarıyla oluşturuldu.",
      outgoingDoc,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Geçici Ürün girş belgesine ürün ekleme
router.post(
  "/addProductToOutgoingVirtualDoc",
  upload.none(),
  async (req, res) => {
    try {
      const {
        virtualDocId,
        productId,
        productQuantity,
        productSalesPrice,
        kdvPercent,
        includeKdv,
      } = req.body;

      const data = await VirtualOutgoingDoc.findById(virtualDocId);
      if (!data) {
        return res
          .status(400)
          .json({ status: "error", message: "Cikis belgesi bulunamadı" });
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

      if (parsedQuantity > foundProduct.productQuantity) {
        return res.status(400).json({
          status: "error",
          message: `Stokta yeterli ürün sayısı yok. Ekleyebileceğiniz maksimum ürün sayısı ${foundProduct.productQuantity} `,
        });
      }

      const parsedproductSalesPrice = parseInt(productSalesPrice, 10);
      if (isNaN(parsedproductSalesPrice) || parsedproductSalesPrice <= 0) {
        return res.status(400).json({
          status: "error",
          message: "Ürün eklenemedi lütfen geçerli bir satış fiyatı girin",
        });
      }

      data.products.push({
        product: foundProduct._id,
        quantity: parsedQuantity,
        productSalesPrice: productSalesPrice,
        includeKDV: includeKdv,
        kdvPercent: kdvPercent,
      });

      // Belge fiyatlarını güncelle
      if (includeKdv) {
        const subAmount = parseFloat(
          (productSalesPrice / (1 + kdvPercent / 100)).toFixed(3)
        );
        const kdvAmount = parseFloat(
          (productSalesPrice - subAmount).toFixed(3)
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
          (productSalesPrice * parsedQuantity).toFixed(3)
        );
        data.taxTotal += parseFloat(
          (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(3)
        );
        if (kdvPercent == 20) {
          data.kdvTotal20 += parseFloat(
            (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(
              3
            )
          );
        }
        if (kdvPercent == 18) {
          data.kdvTotal18 += parseFloat(
            (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(
              3
            )
          );
        }
        if (kdvPercent == 10) {
          data.kdvTotal10 += parseFloat(
            (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(
              3
            )
          );
        }
        if (kdvPercent == 8) {
          data.kdvTotal8 += parseFloat(
            (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(
              3
            )
          );
        }
        if (kdvPercent == 1) {
          data.kdvTotal1 += parseFloat(
            (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(
              3
            )
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
  "/updateOutgoingVirtualDocProducts",
  upload.none(),
  async (req, res) => {
    try {
      const {
        virtualDocId,
        productId,
        quantity,
        kdvPercent,
        includeKdv,
        productSalesPrice,
        productSelfId,
      } = req.body;

      const data = await VirtualOutgoingDoc.findById(virtualDocId);
      if (!data) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün çıkış belgesi bulunamadı.",
        });
      }

      const productItem = data.products.find(
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

      const parsedNewQuantity = parseInt(quantity, 10);
      if (isNaN(parsedNewQuantity) || parsedNewQuantity < 0) {
        return res.status(400).json({
          status: "error",
          message: "Yeni ürün miktarı değeri geçerli bir sayı değil.",
        });
      }

      if (
        parsedNewQuantity >
        productItem.quantity + foundProduct.productQuantity
      ) {
        return res.status(400).json({
          status: "error",
          message: `Stokta yeterli ürün miktarı yok. Bu ürünü güncelleyebileceğiniz maksimum adet: ${
            foundProduct.productQuantity + productItem.quantity
          }`,
        });
      }

      const existingProduct = data.products.find(
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

      // Mevcut çıkış miktarını hesapla

      // Önceki değerleri kaydetmek için kullan
      const prevQuantity = productItem.quantity;
      const prevKdvPercent = productItem.kdvPercent;
      const prevIncludeKdv = productItem.includeKDV;
      const prevProductSalesPrice = productItem.productSalesPrice;

      // Yeni değerleri güncelle
      productItem.quantity = quantity;
      productItem.kdvPercent = kdvPercent;
      productItem.includeKDV = includeKdv;
      productItem.productSalesPrice = productSalesPrice;

      // Önceki ürünün bu belge içindeki toplam değerini çıkar
      let prevSubTotal = 0;
      let prevtaxTotal = 0;

      if (prevIncludeKdv) {
        const prevSubAmount = parseFloat(
          (prevProductSalesPrice / (1 + prevKdvPercent / 100)).toFixed(3)
        );
        const prevKdvAmount = parseFloat(
          (prevProductSalesPrice - prevSubAmount).toFixed(3)
        );
        prevSubTotal = parseFloat((prevSubAmount * prevQuantity).toFixed(3));
        prevtaxTotal = parseFloat((prevKdvAmount * prevQuantity).toFixed(3));

        if (prevKdvPercent == 20) {
          data.kdvTotal20 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 18) {
          data.kdvTotal18 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 10) {
          data.kdvTotal10 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 8) {
          data.kdvTotal8 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 1) {
          data.kdvTotal1 -= parseFloat(prevtaxTotal.toFixed(3));
        }
      } else {
        prevSubTotal = parseFloat(
          (prevProductSalesPrice * prevQuantity).toFixed(3)
        );
        prevtaxTotal = parseFloat(
          (
            prevProductSalesPrice *
            prevQuantity *
            (prevKdvPercent / 100)
          ).toFixed(3)
        );

        if (prevKdvPercent == 20) {
          data.kdvTotal20 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 18) {
          data.kdvTotal18 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 10) {
          data.kdvTotal10 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 8) {
          data.kdvTotal8 -= parseFloat(prevtaxTotal.toFixed(3));
        }
        if (prevKdvPercent == 1) {
          data.kdvTotal1 -= parseFloat(prevtaxTotal.toFixed(3));
        }
      }

      // Yeni ürünün bu belge içindeki toplam değerini hesapla
      let newSubTotal = 0;
      let newTaxTotal = 0;

      if (includeKdv) {
        const subAmount = parseFloat(
          (productSalesPrice / (1 + kdvPercent / 100)).toFixed(3)
        );
        const kdvAmount = parseFloat(
          (productSalesPrice - subAmount).toFixed(3)
        );
        newSubTotal = parseFloat((subAmount * quantity).toFixed(3));
        newTaxTotal = parseFloat((kdvAmount * quantity).toFixed(3));
        if (kdvPercent == 20) {
          data.kdvTotal20 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 18) {
          data.kdvTotal18 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 10) {
          data.kdvTotal10 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 8) {
          data.kdvTotal8 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 1) {
          data.kdvTotal1 += parseFloat(newTaxTotal.toFixed(3));
        }
      } else {
        newSubTotal = parseFloat((productSalesPrice * quantity).toFixed(3));
        newTaxTotal = parseFloat(
          (productSalesPrice * quantity * (kdvPercent / 100)).toFixed(3)
        );
        if (kdvPercent == 20) {
          data.kdvTotal20 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 18) {
          data.kdvTotal18 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 10) {
          data.kdvTotal10 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 8) {
          data.kdvTotal8 += parseFloat(newTaxTotal.toFixed(3));
        }
        if (kdvPercent == 1) {
          data.kdvTotal1 += parseFloat(newTaxTotal.toFixed(3));
        }
      }

      // Mevcut belge değerlerinden önceki ürünün toplamını çıkar ve yeni ürünün toplamını ekle
      data.subTotal -= prevSubTotal;
      data.subTotal += newSubTotal;
      data.taxTotal -= prevtaxTotal;
      data.taxTotal += newTaxTotal;
      data.subTotal = data.subTotal.toFixed(3);
      data.taxTotal = data.taxTotal.toFixed(3);
      data.kdvTotal20 = data.kdvTotal20.toFixed(3);
      data.kdvTotal18 = data.kdvTotal18.toFixed(3);
      data.kdvTotal10 = data.kdvTotal10.toFixed(3);
      data.kdvTotal8 = data.kdvTotal8.toFixed(3);
      data.kdvTotal1 = data.kdvTotal1.toFixed(3);

      data.generalTotal = (data.subTotal + data.taxTotal).toFixed(3);

      data.quantityTotal += quantity - prevQuantity;

      await data.save();

      res.status(200).json({
        status: "success",
        message: "Ürün çıkış belgesi başarıyla güncellendi.",
        data,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.post(
  "/removeProductfromOutgoingDocvirtualDoc",
  upload.none(),
  async (req, res) => {
    try {
      const { virtualDocId, productId } = req.body;

      // Mevcut çıkan ürün girişini bulma
      const outgoingProduct = await VirtualOutgoingDoc.findById(virtualDocId);
      if (!outgoingProduct) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek  ürün çıkış belgesi bulunamadı.",
        });
      }

      // Çıkarılacak ürünü bul ve quantity değerini al
      const productToRemove = outgoingProduct.products.find(
        (product) => product._id.toString() === productId
      );

      if (!productToRemove) {
        return res.status(400).json({
          status: "error",
          message: "Çıkarılacak ürün listede bulunamadı",
        });
      }

      const removedQuantity = productToRemove.quantity;

      // Çıkarılan ürünün quantity değerini Product modelinde artır
      const foundProduct = await Product.findById(productToRemove.product);
      if (!foundProduct) {
        return res.status(400).json({
          status: "error",
          message: "Çıkarılacak ürünün veritabanında kaydı bulunamadı",
        });
      }

      outgoingProduct.products = outgoingProduct.products.filter(
        (product) => product._id.toString() !== productId
      );

      let removedSubTotal = 0;
      let removedTaxTotal = 0;

      if (productToRemove.includeKDV) {
        const removedSubAmount = parseFloat(
          (
            productToRemove.productSalesPrice /
            (1 + productToRemove.kdvPercent / 100)
          ).toFixed(3)
        );
        const removedKdvAmount = parseFloat(
          (productToRemove.productSalesPrice - removedSubAmount).toFixed(3)
        );
        removedSubTotal += parseFloat(
          (removedSubAmount * removedQuantity).toFixed(3)
        );
        removedTaxTotal += parseFloat(
          (removedKdvAmount * removedQuantity).toFixed(3)
        );
        if (productToRemove.kdvPercent == 20) {
          outgoingProduct.kdvTotal20 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 18) {
          outgoingProduct.kdvTotal18 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 10) {
          outgoingProduct.kdvTotal10 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 8) {
          outgoingProduct.kdvTotal8 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 1) {
          outgoingProduct.kdvTotal1 -= parseFloat(removedTaxTotal.toFixed(3));
        }
      } else {
        removedSubTotal = parseFloat(
          (productToRemove.productSalesPrice * removedQuantity).toFixed(3)
        );
        removedTaxTotal = parseFloat(
          (
            ((productToRemove.productSalesPrice * productToRemove.kdvPercent) /
              100) *
            removedQuantity
          ).toFixed(3)
        );
        if (productToRemove.kdvPercent == 20) {
          outgoingProduct.kdvTotal20 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 18) {
          outgoingProduct.kdvTotal18 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 10) {
          outgoingProduct.kdvTotal10 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 8) {
          outgoingProduct.kdvTotal8 -= parseFloat(removedTaxTotal.toFixed(3));
        }
        if (productToRemove.kdvPercent == 1) {
          outgoingProduct.kdvTotal1 -= parseFloat(removedTaxTotal.toFixed(3));
        }
      }

      outgoingProduct.subTotal -= removedSubTotal;
      outgoingProduct.taxTotal -= removedTaxTotal;
      outgoingProduct.quantityTotal -= removedQuantity;

      outgoingProduct.subTotal = outgoingProduct.subTotal.toFixed(3);
      outgoingProduct.taxTotal = outgoingProduct.taxTotal.toFixed(3);
      outgoingProduct.kdvTotal20 = outgoingProduct.kdvTotal20.toFixed(3);
      outgoingProduct.kdvTotal18 = outgoingProduct.kdvTotal18.toFixed(3);
      outgoingProduct.kdvTotal10 = outgoingProduct.kdvTotal10.toFixed(3);
      outgoingProduct.kdvTotal8 = outgoingProduct.kdvTotal8.toFixed(3);
      outgoingProduct.kdvTotal1 = outgoingProduct.kdvTotal1.toFixed(3);

      outgoingProduct.generalTotal = (
        outgoingProduct.subTotal + outgoingProduct.taxTotal
      ).toFixed(3);

      // outgoingProduct'i güncelle
      await outgoingProduct.save();

      res.status(200).json({
        status: "success",
        message: "Ürün başarıyla çıkartıldı.",
        outgoingProduct,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.post(
  "/virtualOutgoingProductDetail",
  upload.none(),
  async (req, res) => {
    try {
      const { virtualDocId } = req.body;
      const data = await VirtualOutgoingDoc.findById(virtualDocId)
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
        message: "Ürün çıkış belgesi detayı başarıyla getirildi",
        data,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.post("/deleteVirtualOutgoingDoc", upload.none(), async (req, res) => {
  try {
    const { virtualDocId } = req.body;
    const data = await VirtualOutgoingDoc.findById(virtualDocId);
    if (!data) {
      return res.status(400).json({
        status: "error",
        message: "Geçici ürün çıkışı bulunamadı.",
      });
    }
    await VirtualOutgoingDoc.findByIdAndDelete(virtualDocId);
    res.status(200).json({
      status: "success",
      message: "Geçici ürün çıkış belgesi  başarıyla silindi",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
