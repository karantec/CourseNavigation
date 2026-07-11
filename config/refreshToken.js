const jwt = require("jsonwebtoken");

const generateToken = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "8d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 24 * 60 * 60 * 1000, // 8 days
  });

  return token;
};

module.exports = generateToken;
