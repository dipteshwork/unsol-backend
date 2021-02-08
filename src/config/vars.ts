const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  env: process.env.NODE_ENV,
  frontendUrl: process.env.FRONTEND_URL,

  sendgridApiUrl: process.env.SENDGRID_API_URL,
  sendgridApiKey: process.env.SENDGRID_API_KEY,

  mailCredential: {
    host: process.env.MAIL_HOST || "smtp.mailtrap.io",
    port: process.env.MAIL_PORT || 2525,
    from: process.env.MAIL_FROM || 'admin@protovate.com',
  }
};
