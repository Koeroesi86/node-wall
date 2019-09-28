const NodeMailer = require('nodemailer');

let config = { jsonTransport: true };
if (process.env.NODEMAILER_HOST) {
  config = {
    host: process.env.NODEMAILER_HOST,
    port: process.env.NODEMAILER_PORT,
    secure: true,
    pool: true,
    maxConnections: 1,
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    }
  };
}
const transporter = NodeMailer.createTransport(config);

module.exports = () => {
  return transporter;
};
