const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

// @desc Login
// @route POST /auth
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body; // Değişiklik: "username" yerine "email" kullanıyoruz

  if (!email || !password) {
    return res.status(400).json({ status: "error", message: "Bütün alanlar doldurulmalı" });
  }

  const lowercaseEmail = email.toLowerCase(); // E-posta adresini küçük harf olarak saklamak isterseniz

  const foundUser = await User.findOne({ email: lowercaseEmail }).exec(); // Değişiklik: Kullanıcı adı yerine e-postayı arıyoruz

  if (!foundUser || !foundUser.active) {
    return res.status(401).json({ status: "error", message: "E-posta veya şifre yanlış" });
  }

  const currentTime = new Date();
  const accessExpiration = foundUser.accessExpiration;

  if (accessExpiration && accessExpiration < currentTime) {
    return res.status(401).json({ status: "error", message: "Süre dolduğu için giriş yapamazsınız" });
  }

  const match = await bcrypt.compare(password, foundUser.password);

  if (!match) return res.status(401).json({ status: "error", message: "E-posta veya şifre yanlış" });

  const accessToken = jwt.sign(
    {
      UserInfo: {
        email: foundUser.email, // Değişiklik: "username" yerine "email" kullanıyoruz
        roles: foundUser.roles,
        _id: foundUser._id,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  const refreshToken = jwt.sign(
    { email: foundUser.email }, // Değişiklik: "username" yerine "email" kullanıyoruz
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // Güvenli çerez oluşturarak yenileme belirteci ile
  res.cookie("jwt", refreshToken, {
    httpOnly: true, // sadece web sunucusu tarafından erişilebilir
    secure: true, // https
    sameSite: "None", // çapraz site çerez
    maxAge: 7 * 24 * 60 * 60 * 1000, // çerez süresi: rT ile eşleştirilmiş
  });

  // E-posta ve rolleri içeren accessToken'i gönder
  res.json({ status: "success", accessToken });
});




// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt)
    return res.status(401).json({ message: "Unauthorizeddddd" });

  const refreshToken = cookies.jwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    asyncHandler(async (err, decoded) => {
      if (err) return res.status(403).json({ message: "Forbidden" });

      const foundUser = await User.findOne({
        username: decoded.username,
      }).exec();

      if (!foundUser) return res.status(401).json({ message: "Unauthorized" });

      const accessToken = jwt.sign(
        {
          UserInfo: {
            username: foundUser.username,
            roles: foundUser.roles,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "15m" }
      );

      res.json({ accessToken });
    })
  );
};

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
  res.json({ message: "Cookie cleared" });
};

module.exports = {
  login,
  refresh,
  logout,
};
