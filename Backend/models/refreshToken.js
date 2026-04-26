const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  refresh_token: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
