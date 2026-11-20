const nodemailer = require('nodemailer');

let transportPromise;

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Email recipient, subject, and content are required');
  }

  if (!transportPromise) {
    transportPromise = nodemailer.createTestAccount()
      .then((account) => ({
        transport: nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        }),
        from: account.user,
      }))
      .catch((error) => {
        transportPromise = undefined;
        throw error;
      });
  }

  const { transport, from } = await transportPromise;
  const info = await transport.sendMail({ from, to, subject, text, html });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.info(`Ethereal email preview: ${previewUrl}`);

  return { messageId: info.messageId };
}

module.exports = { sendEmail };
