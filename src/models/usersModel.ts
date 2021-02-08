import mongoose = require("mongoose");
import { Schema } from "mongoose";

let UsersSchema = new Schema(
  {
    userEmail: String,
    userName: String,
    roles: { type: [String], required: true },
    langs: { type: [String], required: true },
    preferLanguage: String,
    isActive: Boolean,
    activationHistory: [
      {
        _id: false,
        isActive: { type: Boolean, required: true },
        userUpdatedOn: { type: Date, required: true },
        role: String,
        preferLanguage: String,
        roleUpdatedOn: Date,
      },
    ],
  },
  { versionKey: false }
);

/*
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UsersSchema = new Schema({
  email: String,
  hash: String,
  salt: String,
});

UsersSchema.methods.setPassword = function(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
};

UsersSchema.methods.validatePassword = function(password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, 'sha512').toString('hex');
  return this.hash === hash;
};

UsersSchema.methods.generateJWT = function() {
  const today = new Date();
  const expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + 60);

  return jwt.sign({
    email: this.email,
    id: this._id,
    exp: parseInt(expirationDate.getTime() / 1000, 10),
  }, 'secret');
}

UsersSchema.methods.toAuthJSON = function() {
  return {
    _id: this._id,
    email: this.email,
    token: this.generateJWT(),
  };
};
*/

let UsersModel = mongoose.model("UsersModel", UsersSchema, "users");
export default UsersModel;
