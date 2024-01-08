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
const VirtualIncomingDoc = require("../models/VirtualIncomingDoc.js");

router.use(verifyJWT);

async function incrementDocumentCounter(userId) {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { documentCounter: 1 } },
      { new: true }
    );

    return user.documentCounter;
  } catch (error) {
    console.error("Error incrementing document counter:", error);
    return null;
  }
}

// Sıradaki belge dokuman numarasını getiren endpoint
router.get("/getNextDocumentNumber", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const nextDocumentNumber = (user.documentCounter + 1)
      .toString()
      .padStart(5, "0");
    res.status(200).json({ nextDocumentNumber });
  } catch (error) {
    res.status(500).json({
      error: "An error occurred while fetching the next document number.",
    });
  }
});

//Yeni bir gelen ürün belgesi ekleyen  endpoint
router.post("/addIncomingProduct", upload.none(), async (req, res) => {
  try {
    const { documentDate, order, description } = req.body;

    const createdBy = req.user._id;

    // Kullanıcının belge sayacını artır
    await User.findByIdAndUpdate(createdBy, { $inc: { documentCounter: 1 } });

    const user = await User.findById(createdBy);
    const documentNumber = user.documentCounter.toString().padStart(5, "0");

    const data = new IncomingProduct({
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
      message: "Ürün girişi başarıyla oluşturuldu.",
      data,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// router.post(
//   "/addIncomingProductWithProducts",
//   upload.none(),
//   async (req, res) => {
//     try {
//       const { documentDate, order, description, products } = req.body;
//       const createdBy = req.user._id;

//       const user = await User.findById(createdBy);

//       const documentNumber = (user.documentCounter + 1)
//         .toString()
//         .padStart(5, "0");

//       // Yeni belge oluştur
//       const incomingProductData = new IncomingProduct({
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
//         const kdvPercent = productInfo.kdvPercent; // Varsayılan olarak 20%
//         const productPurchasePrice = productInfo.productPurchasePrice;
//         const includeKdv = productInfo.includeKdv; // KDV dahil mi?

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

//         // Ürün fiyatlarını hesapla
//         let productPrice =
//           productPurchasePrice || foundProduct.productListPrice;
//         let productTotal = 0; // Ürün toplamı

//         if (includeKdv) {
//           // KDV dahilse yapılan hesaplama
//           subAmount = productPurchasePrice / (1 + kdvPercent / 100);
//           kdvAmoumt = productPurchasePrice - subAmount;
//           subTotal += subAmount * quantity;
//           taxTotal += kdvAmoumt * quantity;
//         } else {
//           // KDV dahil değilse yapılan hesaplama
//           subTotal += productPurchasePrice * quantity;
//           taxTotal += productPurchasePrice * quantity * (kdvPercent / 100);
//         }

//         if (kdvPercent == 20) {
//           incomingProductData.kdvTotal20 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 18) {
//           incomingProductData.kdvTotal18 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 10) {
//           incomingProductData.kdvTotal10 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 8) {
//           incomingProductData.kdvTotal8 += taxTotal.toFixed(3);
//         }
//         if (kdvPercent == 1) {
//           incomingProductData.kdvTotal1 += taxTotal.toFixed(3);
//         }

//         quantityTotal += quantity;

//         // Product modelindeki quantity değerini güncelle
//         foundProduct.productQuantity += quantity;
//         await foundProduct.save();

//         // Ürünü gelen ürün belgesine ekle
//         incomingProductData.products.push({
//           product: foundProduct._id,
//           quantity: quantity,
//           kdvPercent: kdvPercent,
//           productPurchasePrice: productPrice,
//           productTotal: productTotal,
//           includeKdv: includeKdv,
//         });
//       }

//       // Genel toplamı hesapla ve virgül hassasiyetini kontrol et
//       const generalTotal = (subTotal + taxTotal).toFixed(3);
//       subTotal = subTotal.toFixed(3);
//       taxTotal = taxTotal.toFixed(3);

//       incomingProductData.subTotal = subTotal;
//       incomingProductData.taxTotal = taxTotal;
//       incomingProductData.generalTotal = generalTotal;
//       incomingProductData.quantityTotal = quantityTotal;

//       await incomingProductData.save();

//       // Belge oluşturulduktan sonra kullanıcının documentCounter değerini artır
//       await User.findByIdAndUpdate(createdBy, { $inc: { documentCounter: 1 } });

//       res.status(200).json({
//         status: "success",
//         message: "Ürün giriş belgesi başarıyla oluşturuldu.",
//         data: incomingProductData,
//       });
//     } catch (error) {
//       res.status(500).json({ status: "error", message: error.message });
//     }
//   }
// );

router.post(
  "/addIncomingProductWithProducts",
  upload.none(),
  async (req, res) => {
    try {
      const { virtualDocId, documentDate, order, description } = req.body;

      // Kullanıcı kimliğini alın veya isteği gönderen kullanıcıya atayın
      const createdBy = req.user._id;

      // Kullanıcıyı veritabanından bulun veya oluşturun
      let user = await User.findById(createdBy);
      if (!user) {
        user = new User({ _id: createdBy });
        await user.save();
      }

      // Kullanıcının belge sayacını güncelleyin
      const documentNumber = (user.documentCounter + 1)
        .toString()
        .padStart(5, "0");

      const documentData = new IncomingProduct({
        documentDate,
        documentNumber,
        order,
        description,
        createdBy,
      });

      const data = await VirtualIncomingDoc.findById(virtualDocId);
      if (!data) {
        return res.status(400).json({
          status: "error",
          message: "Geçici belge bulunamadı.",
        });
      }

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

        foundProduct.productQuantity += quantity;
        await foundProduct.save();
      }

      await documentData.save();

      await VirtualIncomingDoc.findByIdAndDelete(virtualDocId);

      // Kullanıcının belge sayacını artırın ve kaydedin
      user.documentCounter++;
      await user.save();

      res.status(200).json({
        status: "success",
        message: "Ürün giriş belgesi başarıyla oluşturuldu.",
        data: documentData,
      });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

//Yeni ürün belgesine ürün ekleyen endpoint
router.post("/addProductToIncomingProduct", upload.none(), async (req, res) => {
  try {
    const {
      incomingProductId,
      productId,
      productQuantity,
      productPurchasePrice,
      kdvPercent,
      includeKdv,
    } = req.body;

    const data = await IncomingProduct.findById(incomingProductId);
    if (!data) {
      return res
        .status(400)
        .json({ status: "error", message: "Giriş belgesi bulunamadı" });
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
    const parsedproductPurchasePrice = parseInt(productPurchasePrice, 10);
    if (isNaN(parsedproductPurchasePrice) || parsedproductPurchasePrice <= 0) {
      return res
        .status(400)
        .json({ status: "error", message: "Geçerli bir alış fiyatı girin" });
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

    data.products.push({
      product: foundProduct._id,
      quantity: parsedQuantity,
      productPurchasePrice: productPurchasePrice,
      includeKDV: includeKdv,
      kdvPercent: kdvPercent,
    });

    // Ürün miktarını güncelle
    foundProduct.productQuantity += parsedQuantity;

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
        data.kdvTotal20 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
      }
      if (kdvPercent == 18) {
        data.kdvTotal18 += parseFloat((kdvAmount * parsedQuantity).toFixed(3));
      }
      if (kdvPercent == 10) {
        console.log("AAAAAAAAAAAA");
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
        (productPurchasePrice * parsedQuantity).toFixed(3)
      );
      data.taxTotal += parseFloat(
        (((productPurchasePrice * kdvPercent) / 100) * parsedQuantity).toFixed(
          3
        )
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

// Gelen belgesindeki ürünlerin adedini güncelle
router.post(
  "/updateIncomingProductQuantity",
  upload.none(),
  async (req, res) => {
    try {
      const {
        incomingProductId,
        productId,
        quantity,
        kdvPercent,
        includeKdv,
        productPurchasePrice,
        productSelfId,
      } = req.body;

      // Mevcut ürün girişini bulma
      const incomingProduct = await IncomingProduct.findById(incomingProductId);
      if (!incomingProduct) {
        return res.status(400).json({
          status: "error",
          message: "Güncellenecek ürün giriş belgesi bulunamadı.",
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
      const productItem = incomingProduct.products.find(
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

      if (quantity + foundProduct.productQuantity < productItem.quantity) {
        return res.status(400).json({
          status: "error",
          message: `Stokta güncellemek istediğiniz miktarda ürün yok. Güncelleyebileceğiniz minimum ürün adeti: ${
            productItem.quantity + foundProduct.productQuantity
          }`,
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

      incomingProduct.quantityTotal += quantity - prevQuantity;
      // Ürün miktarını güncelle
      const quantityDiff = quantity - prevQuantity;
      foundProduct.productQuantity += quantityDiff;

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

      await foundProduct.save();
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

// Girilen ürünleri güncelleme
router.post("/updateIncomingProduct", upload.none(), async (req, res) => {
  try {
    const { _id, documentDate, order, description } = req.body;

    // Mevcut ürün girişini bulma
    const incomingProduct = await IncomingProduct.findById(_id);
    if (!incomingProduct) {
      throw new Error("Güncellenecek ürün girişi bulunamadı");
    }

    incomingProduct.documentDate = documentDate;
    incomingProduct.order = order;
    incomingProduct.description = description;

    await incomingProduct.save();

    res.status(200).json({
      status: "success",
      message: "Ürün girişi başarıyla güncellendi.",
      incomingProduct,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Girilen ürünler datasında bir ürün silme
router.post("/removeProduct", upload.none(), async (req, res) => {
  try {
    const { incomingProductId, productId } = req.body;

    // Mevcut ürün girişini bulma
    const incomingProduct = await IncomingProduct.findById(incomingProductId);
    if (!incomingProduct) {
      return res.status(400).json({
        status: "error",
        message: "Güncellenecek ürün giriş belgesi bulunamadı",
      });
    }

    if (incomingProduct.products.length === 1) {
      return res.status(400).json({
        status: "error",
        message: "Belgede en az 1 tane ürün bulunmalıdır.",
      });
    }
    
    // Çıkarılacak ürünproductü bul ve quantity değerini al
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

    if (foundProduct.productQuantity < removedQuantity) {
      return res.status(400).json({
        status: "error",
        message: `Bu ürünü silemezsiniz. Stokta yeterli öğe yok. Stoktan  eksiltebileceğiniz maksimum adet : ${foundProduct.productQuantity}`,
      });
    }

    // Çıkarılan ürünün quantity değerini Product modelinde azalt
    foundProduct.productQuantity += removedQuantity;
    await foundProduct.save();

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
      removedSubTotal = parseFloat(
        (removedSubAmount * removedQuantity).toFixed(3)
      );
      removedTaxTotal = parseFloat(
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
          ((productToRemove.productPurchasePrice * productToRemove.kdvPercent) /
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

    incomingProduct.subTotal = incomingProduct.subTotal.toFixed(3);
    incomingProduct.taxTotal = incomingProduct.taxTotal.toFixed(3);
    incomingProduct.kdvTotal20 = incomingProduct.kdvTotal20.toFixed(3);
    incomingProduct.kdvTotal18 = incomingProduct.kdvTotal18.toFixed(3);
    incomingProduct.kdvTotal10 = incomingProduct.kdvTotal10.toFixed(3);
    incomingProduct.kdvTotal8 = incomingProduct.kdvTotal8.toFixed(3);
    incomingProduct.kdvTotal1 = incomingProduct.kdvTotal1.toFixed(3);

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
});

// Ürün giriş belgelerini getirme
router.get("/getIncomingProducts", upload.none(), async (req, res) => {
  try {
    const incomingProducts = await IncomingProduct.find({
      createdBy: req.user._id,
    }).populate("order", "_id isim");
    res.status(200).json({
      status: "success",
      message: "Ürün girişleri listelendi.",
      incomingProducts,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//Üürnn giriş belgesi detayı
router.post("/incomingProductdetail", upload.none(), async (req, res) => {
  try {
    const { incomingProductId } = req.body;
    const data = await IncomingProduct.findById(incomingProductId)
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
});

module.exports = router;
