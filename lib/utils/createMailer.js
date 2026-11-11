const NodeMailer = require('nodemailer');

const zohoDomain = process.env.ZOHO_DOMAIN || 'com';
const tokenRefreshMargin = 60 * 1000;
let cachedToken;

const requestJson = async (url, options) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Zoho request failed (${response.status}): ${JSON.stringify(body.status || body.error || body)}`);
  }

  return body;
};

const getAccessToken = async () => {
  if (cachedToken && cachedToken.expiresAt - tokenRefreshMargin > Date.now()) return cachedToken.value;

  const body = await requestJson(`https://accounts.zoho.${zohoDomain}/oauth/v2/token`, {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    }),
  });

  if (!body.access_token) throw new Error(`Zoho token refresh failed: ${JSON.stringify(body.error || body)}`);

  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
};

/**
 * Sends over the Zoho Mail HTTPS API, because the VPS blocks outbound SMTP.
 * Keeps the `sendMail(options, callback)` shape of nodemailer.
 */
const sendViaZoho = async ({ from, to, subject, html }) => {
  const token = await getAccessToken();
  const body = await requestJson(
    `https://mail.zoho.${zohoDomain}/api/accounts/${process.env.ZOHO_ACCOUNT_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        fromAddress: from,
        toAddress: to,
        subject,
        content: html,
        mailFormat: 'html',
        encoding: 'UTF-8',
      }),
    },
  );

  return { envelope: { from, to: [to] }, messageId: body.data && body.data.messageId };
};

const createZohoTransport = () => ({
  sendMail(options, callback) {
    const result = sendViaZoho(options);
    if (!callback) return result;

    result.then(
      (info) => callback(undefined, info),
      (err) => callback(err),
    );
  },
});

const createSmtpTransport = () => NodeMailer.createTransport({
  host: process.env.NODEMAILER_HOST,
  port: process.env.NODEMAILER_PORT,
  secure: true,
  pool: true,
  maxConnections: 1,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

const createTransport = () => {
  if (process.env.ZOHO_REFRESH_TOKEN) return createZohoTransport();
  if (process.env.NODEMAILER_HOST) return createSmtpTransport();
  return NodeMailer.createTransport({ jsonTransport: true });
};

const transporter = createTransport();

module.exports = () => transporter;
