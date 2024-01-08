const User = require("../models/User");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

//Yeni bir kullanıcı ekle

// @desc Get all users
// @route GET /users
// @access Private
const getUserDetail = asyncHandler(async (req, res) => {
  try {
    // Assuming req.user contains the user information including _id
    const { _id } = req.user;

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "Kullanici bulunamadi" });
    }

    const data = {
      _id : user._id,
      username: user.username,
      roles: user.roles,
      email: user.email,
      userImage: user.userImage
      
    }

    res.status(200).json({ status: "success", data});
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});




// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
  const { username, password, roles, email, userImage } = req.body;

  // Kullanıcı adı ve e-postayı küçük harf olarak saklayın
  const lowercaseUsername = username.toLowerCase();
  const lowercaseEmail = email.toLowerCase();

  // Confirm data
  if (!lowercaseUsername || !password || !lowercaseEmail) {
    return res.status(400).json({ message: "Bütün alanlar doldurulmalı" });
  }

  // Check for duplicate username or email (kullanıcı adı veya e-posta için)
  const duplicate = await User.findOne({ $or: [{ username: lowercaseUsername }, { email: lowercaseEmail }] }).lean().exec();

  if (duplicate) {
    return res.status(409).json({ message: "Aynı kullanıcı adı veya e-posta ile kayıt zaten var" });
  }

  // Hash password
  const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

  const userObject = { username: lowercaseUsername, password: hashedPwd, roles, email: lowercaseEmail, userImage };

  // Calculate the registration date
  const registrationDate = new Date();
  const accessExpiration = new Date(
    registrationDate.getTime() + 180 * 24 * 60 * 60 * 1000
  ); // 6 ay eklenir (180 gün)

  userObject.accessExpiration = accessExpiration;

  // Create and store new user
  const user = await User.create(userObject);

  if (user) {
    // Created
    res
      .status(201)
      .json({ status: "success", message: `Yeni kullanıcı ${lowercaseUsername} oluşturuldu` });
  } else {
    res
      .status(400)
      .json({ status: "error", message: "Geçersiz kullanıcı verisi alındı" });
  }
});

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (req, res) => {
  const { id, username, roles , email , userImage,kdvPercent} = req.body;

  // Confirm data
  if (
    !id ||
    !username ||
    !email
  ) {
    return res
      .status(400)
      .json({status:"error", message: "Kullanici adi ve email doldurulmali" });
  }

  // Does the user exist to update?
  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({status:"error", message: "Kullanici bulunamadi" });
  }

  // Check for duplicate
  const duplicate = await User.findOne({ username }).lean().exec();

  // Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({status:"error", message: "Ayni username ya da email'e ait bir kayit zaten var" });
  }

  user.username = username;
  user.roles = roles;
  user.email = email;
  user.userImage = userImage;
  user.kdvPercent = kdvPercent;



  const updatedUser = await user.save();

  res.json({status:"success", message: `${updatedUser.username} guncellendi` });
});


const updateUserPassword = asyncHandler(async (req, res) => {
  const { id, oldPassword, newPassword } = req.body;

try {
  if (!oldPassword || !newPassword) {
    return res.status(400).json({status:"error", message: "Eski ve yeni şifreleri doldurmalısınız" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ status:"error",message: "Kullanıcı bulunamadı" });
  }

  // Eski şifreyi kontrol et
  const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ status:"error",message: "Eski şifre yanlış" });
  }

  // Yeni şifreyi ayarla
  user.password = await bcrypt.hash(newPassword, 10); // salt rounds

  const updatedUser = await user.save();

  res.json({status:"success", message: `${updatedUser.username} güncellendi` });
} catch (error) {
  res.status(500).json({ status: "error", message: error });
}
});

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: "User ID Required" });
  }

  // Does the user still have assigned notes?

  // Does the user exist to delete?
  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const result = await user.deleteOne();

  const reply = `Username ${result.username} with ID ${result._id} deleted`;

  res.json(reply);
});

module.exports = {
  updateUserPassword,
  getUserDetail,
  createNewUser,
  updateUser,
  deleteUser,
};
