const OutgoingProduct = require("../models/OutgoingProduct.js");
const IncomingProduct = require("../models/IncomingProduct.js");
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
const VirtualOutgoingDoc = require("../models/VirtualOutgoingDoc.js");

router.use(verifyJWT);

async function getNextSequenceValue(sequenceName) {
  const sequenceDocument = await Counter.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );

  return sequenceDocument.sequence_value;
}

//Çıkan ürünleri ekleme
router.post("/addOutgoingProduct", upload.none(), async (req, res) => {
  try {
    const { documentDate, order, description } = req.body;

    const createdBy = req.user._id;

    // Kullanıcının belge sayacını artır
    await User.findByIdAndUpdate(createdBy, { $inc: { documentCounter: 1 } });

    const user = await User.findById(createdBy);
    const documentNumber = user.documentCounter.toString().padStart(5, "0");

    const data = new OutgoingProduct({
      documentDate,
      documentNumber,
      order,
      description,
      products: [],
      createdBy,
    });

    await data.save();

    res.status(200).json({
      status: "success",
      message: "Ürün çıkışı başarıyla oluşturuldu.",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Ürün çıkış belgesine ürün ekleme
router.post("/addProductToOutgoingProduct", upload.none(), async (req, res) => {
  try {
    const {
      outgoingProductId,
      productId,
      productQuantity,
      productSalesPrice,
      kdvPercent,
      includeKdv,
    } = req.body;

    const data = await OutgoingProduct.findById(outgoingProductId);
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

    const parsedQuantity = parseInt(productQuantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Geçerli bir ürün miktarı girin" });
    }

    if (parsedQuantity > foundProduct.productQuantity) {
      return res.status(400).json({
        status: "error",
        message: `Stokta yeterli ürün sayısı yok. Ekleyebileceğiniz maksimum ürün sayısı ${foundProduct.productQuantity} `,
      });
    }
    const parsedproductSalesPrice = parseInt(productSalesPrice, 10);
    if (isNaN(parsedproductSalesPrice) || parsedproductSalesPrice <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Geçerli bir satış fiyatı girin" });
    }

    const productItemExist = data.products.find(
      (p) => p.product.toString() === productId
    );

    if (productItemExist) {
      if (productItemExist.kdvPercent !== kdvPercent) {
        return res.status(400).json({
          status: "error",
          message: "Bir belgede aynı üründen farklı KDV oranlarında bulunamaz.",
        });
      }
    }

    // Eğer aynı ürün daha önce eklenmemişse, yeni bir ürün olarak ekle.
    data.products.push({
      product: foundProduct._id,
      quantity: parsedQuantity,
      productSalesPrice: productSalesPrice,
      includeKDV: includeKdv,
      kdvPercent: kdvPercent,
    });

    // Ürün miktarını güncelle
    foundProduct.productQuantity -= parsedQuantity;

    // Belge fiyatlarını güncelle
    if (includeKdv) {
      const subAmount = parseFloat(
        (productSalesPrice / (1 + kdvPercent / 100)).toFixed(3)
      );
      const kdvAmount = parseFloat((productSalesPrice - subAmount).toFixed(3));
      data.subTotal += parseFloat((subAmount * parsedQuantity).toFixed(3));
      data.taxTotal += parseFloat((kdvAmount * parsedQuantity).toFixed(3));

      if (kdvPercent == 20) {
        data.kdvTotal20 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
      }
      if (kdvPercent == 18) {
        data.kdvTotal18 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
      }
      if (kdvPercent == 10) {
        data.kdvTotal10 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
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
          (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(3)
        );
      }
      if (kdvPercent == 18) {
        data.kdvTotal18 += parseFloat(
          (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(3)
        );
      }
      if (kdvPercent == 10) {
        data.kdvTotal10 += parseFloat(
          (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(3)
        );
      }
      if (kdvPercent == 8) {
        data.kdvTotal8 += parseFloat(
          (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(3)
        );
      }
      if (kdvPercent == 1) {
        data.kdvTotal1 += parseFloat(
          (((productSalesPrice * kdvPercent) / 100) * parsedQuantity).toFixed(3)
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

    await foundProduct.save();

    await data.save();

    res.status(200).json({
      status: "success",
      message: "Ürün girişi başarıyla gerçekleştirildi.",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post(
  "/addOutgoingProductWithProducts",
  upload.none(),
  async (req, res) => {
    try {
      const { virtualDocId, documentDate, order, description } = req.body;

      const createdBy = req.user._id;

      const user = await User.findById(createdBy);
      const documentNumber = (user.documentCounter + 1)
        .toString()
        .padStart(5, "0");

      const data = await VirtualOutgoingDoc.findById(virtualDocId);
      if (!data) {
        return res.status(400).json({
          status: "error",
          message: "Sanala koymamışsın ki bir şeyler.",
        });
      }

      const documentData = new OutgoingProduct({
        documentDate,
        documentNumber,
        order,
        description,
        createdBy,
      });

      if (data.products.length == 0) {
        return res.status(400).json({
          status: "error",
          message: "Lütfen belgeye ürün ekleyin. Boş belge oluşturulamaz.",
        });
      }

      documentData.products = data.products;
      documentData.subTotal = data.subTotal;
      documentData.taxTotal = data.taxTotal;
      documentData.generalTotal = data.generalTotal;
      documentData.quantityTotal = data.quantityTotal;
      documentData.kdvTotal20 = data.kdvTotal20;
      documentData.kdvTotal18 = data.kdvTotal18;
      documentData.kdvTotal10 = data.kdvTotal10;
      documentData.kdvTotal8 = data.kdvTotal8;
      documentData.kdvTotal1 = data.kdvTotal1;

      for (const productInfo of data.products) {
        const productId = productInfo.product;
        const quantity = parseInt(productInfo.quantity, 10);

        const foundProduct = await Product.findById(productId);
        if (!foundProduct) {
          return res
            .status(400)
            .json({ status: "error", message: "Ürün bulunamadı" });
        }

        foundProduct.productQuantity -= quantity;
        await foundProduct.save();
      }

      await documentData.save();

      await VirtualOutgoingDoc.findByIdAndDelete(virtualDocId);

      await User.findByIdAndUpdate(createdBy, { $inc: { documentCounter: 1 } });

      res.status(200).json({
        status: "success",
        message: "Ürün çıkış belgesi başarıyla oluşturuldu.",
        data: documentData,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

//Yeni ürün çıkış belgesi oluşturma
// router.post(
//   "/addOutgoingProductWithProducts",
//   upload.none(),
//   async (req, res) => {
//     try {
//       const { documentDate, order, description, products } = req.body;

//       const createdBy = req.user._id;

//       const user = await User.findById(createdBy);
//       const documentNumber = (user.documentCounter + 1)
//         .toString()
//         .padStart(5, "0");

//       const documentData = new OutgoingProduct({
//         documentDate,
//         documentNumber,
//         order,
//         description,
//         products: [],
//         createdBy,
//       });

//       let subTotal = 0; // Kdvsiz toplam
//       let taxTotal = 0; // Kdv toplam
//       let quantityTotal = 0; // Toplam adet

//       for (const productInfo of products) {
//         const productId = productInfo.productId;
//         const quantity = parseInt(productInfo.quantity, 10);
//         const kdvPercent = productInfo.kdvPercent || 20; // Varsayılan olarak 20%
//         const productSalesPrice = productInfo.productSalesPrice || 0;
//         const includeKdv = productInfo.includeKdv || true; // KDV dahil mi?

//         const foundProduct = await Product.findById(productId);
//         if (!foundProduct) {
//           return res
//             .status(400)
//             .json({ status: "error", message: "Ürün bulunamadı" });
//         }

//         if (isNaN(quantity) || quantity <= 0) {
//           return res.status(400).json({
//             status: "error",
//             message: "Geçerli bir ürün miktarı girin",
//           });
//         }

//         if (quantity > foundProduct.productQuantity) {
//           return res.status(400).json({
//             status: "error",
//             message: "Stokta yeterli ürün sayısı yok",
//             availableQuantity: foundProduct.productQuantity,
//           });
//         }

//         let productPrice = productSalesPrice || foundProduct.productListPrice;
//         let productTotal = 0; // Ürün toplamı

//         if (includeKdv) {
//           // KDV dahilse yapılan hesaplama
//           subAmount = productSalesPrice / (1 + kdvPercent / 100);
//           kdvAmoumt = productSalesPrice - subAmount;
//           subTotal += subAmount * quantity;
//           taxTotal += kdvAmoumt * quantity;
//         } else {
//           // KDV dahil değilse yapılan hesaplama
//           subTotal += productSalesPrice * quantity;
//           taxTotal += productSalesPrice * quantity * (kdvPercent / 100);
//         }

//         if (kdvPercent == 20) {
//           documentData.kdvTotal20 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 18) {
//           documentData.kdvTotal18 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 10) {
//           documentData.kdvTotal10 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 8) {
//           documentData.kdvTotal8 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 1) {
//           documentData.kdvTotal1 += taxTotal.toFixed(3);
//         }

//         quantityTotal += quantity;

//         // Update product quantity
//         foundProduct.productQuantity -= quantity;
//         await foundProduct.save();

//         // Add product and quantity to the document
//         documentData.products.push({
//           product: foundProduct._id,
//           quantity: quantity,
//           kdvPercent: kdvPercent,
//           productSalesPrice: productPrice,
//           productTotal: productTotal,
//           includeKDV: includeKdv,
//         });
//       }

//       const generalTotal = (subTotal + taxTotal).toFixed(3);
//       subTotal = subTotal.toFixed(3);
//       taxTotal = taxTotal.toFixed(3);

//       documentData.subTotal = subTotal;
//       documentData.taxTotal = taxTotal;
//       documentData.generalTotal = generalTotal;
//       documentData.quantityTotal = quantityTotal;

//       // Save the document with products
//       await documentData.save();

//       await User.findByIdAndUpdate(createdBy, { $inc: { documentCounter: 1 } });

//       res.status(200).json({
//         status: "success",
//         message: "Ürün çıkış belgesi başarıyla oluşturuldu.",
//         data: documentData,
//       });
//     } catch (error) {
//       res.status(500).json({ status: "error", message: error.message });
//     }
//   }
// );

// router.post("/addOutgoingProductWithProducts", upload.none(), async (req, res) => {
//   try {
//     const { virtualDocId, documentDate, order, description } = req.body;

//     const createdBy = req.user._id;

//     const user = await User.findById(createdBy);
//     const documentNumber = (user.documentCounter + 1)
//       .toString()
//       .padStart(5, "0");

//     const data = await VirtualOutgoingDoc.findById(virtualDocId);
//     if (!data) {
//       return res.status(400).json({
//         status: "error",
//         message: "Sanala koymamışsın ki bir şeyler.",
//       });
//     }

//     const documentData = new IncomingProduct({
//       documentDate,
//       documentNumber,
//       order,
//       description,
//       createdBy,
//     });

//     documentData.ozellik = data.ozellik;
//     documentData.products = data.products;
//     documentData.subTotal = data.subTotal;
//     documentData.taxTotal = data.taxTotal;
//     documentData.generalTotal = data.generalTotal;
//     documentData.quantityTotal = data.quantityTotal;
//     documentData.kdvTotal20 = data.kdvTotal20;
//     documentData.kdvTotal18 = data.kdvTotal18;
//     documentData.kdvTotal10 = data.kdvTotal10;
//     documentData.kdvTotal8 = data.kdvTotal8;
//     documentData.kdvTotal1 = data.kdvTotal1;

//     await documentData.save();

//     await VirtualOutgoingDoc.findByIdAndDelete(virtualDocId);

//     await User.findByIdAndUpdate(createdBy, { $inc: { documentCounter: 1 } });

//     res.status(200).json({
//       status: "success",
//       message: "Ürün çıkış belgesi başarıyla oluşturuldu.",
//       data: documentData,
//     });
//   } catch (error) {
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });

//Ürün çıkış belgesine eklenen ürünleri update etme
router.post(
  "/updateOutgoingProductQuantity",
  upload.none(),
  async (req, res) => {
    try {
      const {
        outgoingProductId,
        productId,
        quantity,
        kdvPercent,
        includeKdv,
        productSalesPrice,
        productSelfId,
      } = req.body;

      const data = await OutgoingProduct.findById(outgoingProductId);
      if (!data) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün çıkış belgesi bulunamadı.",
        });
      }

      const foundProduct = await Product.findById(productSelfId);
      if (!foundProduct) {
        return res.status(400).json({
          status: "error",
          message: "Veri tabanında  ürün bulunamadı.",
        });
      }

      // Ürün girişinin içindeki ürünü bulma
      const productItem = data.products.find(
        (p) => p._id.toString() === productId
      );
      if (!productItem) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün bulunamadı.",
        });
      }

      const parsedNewQuantity = parseInt(quantity, 10);
      if (isNaN(parsedNewQuantity) || parsedNewQuantity < 0) {
        return res.status(400).json({
          status: "error",
          message: "Yeni ürün miktarı geçerli bir sayı değil.",
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
      // Eski quantity değerini güncelle
      const quantityDiff = quantity - prevQuantity;

      // Product modelindeki quantity değerini güncelle
      foundProduct.productQuantity -= quantityDiff;
      await foundProduct.save();

      await data.save();

      res.status(200).json({
        status: "success",
        message: "Ürün çıkışı başarıyla güncellendi.",
        data,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

// Çıkan ürünleri güncelleme
router.post("/updateOutgoingProduct", upload.none(), async (req, res) => {
  try {
    const { _id, documentDate, order, description } = req.body;

    // Mevcut çıkan ürün girişini bulma
    const outgoingProduct = await OutgoingProduct.findById(_id);
    if (!outgoingProduct) {
      return res.status(400).json({
        status: "error",
        message: "Güncellenecek  ürün çıkış belgesi bulunamadı.",
      });
    }

    // Veri tiplerini kontrol etmek için forEach ile tüm ürünleri dönüyoruz

    // Güncellenen ürünün quantity farkını hesapla

    outgoingProduct.documentDate = documentDate;
    outgoingProduct.order = order;
    outgoingProduct.description = description;

    await outgoingProduct.save();

    res.status(200).json({
      status: "success",
      message: "Çıkan ürün girişi başarıyla güncellendi.",
      outgoingProduct,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Çıkan ürünleri silme
router.post("/removeOutgoingProduct", upload.none(), async (req, res) => {
  try {
    const { outgoingProductId, productId } = req.body;

    // Mevcut çıkan ürün girişini bulma
    const outgoingProduct = await OutgoingProduct.findById(outgoingProductId);
    if (!outgoingProduct) {
      return res.status(400).json({
        status: "error",
        message: "Güncellenecek  ürün çıkış belgesi bulunamadı.",
      });
    }

    if (outgoingProduct.products.length === 1) {
      return res.status(400).json({
        status: "error",
        message: "Belgede en az 1 tane ürün bulunmalıdır.",
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

    foundProduct.productQuantity -= removedQuantity;
    await foundProduct.save();

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
});

// Çıkan ürünleri getirme
router.get("/getOutgoingProducts", async (req, res) => {
  try {
    const outgoingProducts = await OutgoingProduct.find({
      createdBy: req.user._id,
    }).populate("order", "_id isim");
    res.status(200).json({
      status: "success",
      message: "Çıkan ürün girişleri listelendi.",
      outgoingProducts,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Bütün belgeleri getir
router.get("/allDocuments", async (req, res) => {
  try {
    const incomingProducts = await IncomingProduct.find({
      createdBy: req.user._id,
    }).populate("order", "_id isim");
    const outgoingProducts = await OutgoingProduct.find({
      createdBy: req.user._id,
    }).populate("order", "_id isim");

    // Tüm belgeleri bir dizi olarak birleştirme
    const data = [...incomingProducts, ...outgoingProducts];

    // updatedAt alanına göre en güncelden eskiye sıralama
    data.sort((a, b) => b.updatedAt - a.updatedAt);

    res.status(200).json({
      status: "success",
      message: "Tüm belgeler listelendi",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Tedarikçi ya da müşteriye ait tüm geçmiş işlemleri getir
router.post("/listTransactions", upload.none(), async (req, res) => {
  try {
    const { _id } = req.body;

    // Tedarikçiye bağlı işlemleri çek
    const incomingTransactions = await IncomingProduct.find({ order: _id })
      .populate("order")
      .populate("products.product");

    // Müşteriye bağlı işlemleri çek
    const outgoingTransactions = await OutgoingProduct.find({ order: _id })
      .populate("order")
      .populate("products.product");

    const data = [...incomingTransactions, ...outgoingTransactions];

    res.status(200).json({
      status: "success",
      message: "İşlemler başarıyla çekildi.",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Ürün çıkış belgesi detay
router.post("/outgoingProductdetail", upload.none(), async (req, res) => {
  try {
    const { outgoingProductId } = req.body;
    const data = await OutgoingProduct.findById(outgoingProductId)
      .populate(
        "products.product",
        "productName productCode productDescription productQuantity productImage productPackageType"
      )
      .populate("order", "_id isim");
    if (!data) {
      return res.status(400).json({
        status: "error",
        message: "Ürün çıkış belgesi bulunamadı.",
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
});

module.exports = router;
