const nodemailer = require('nodemailer');

let transportPromise;

async function createTransport() {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT || 587);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_PORT must be a valid port number');
    }
    if (!process.env.MAIL_FROM) {
      throw new Error('MAIL_FROM is required when SMTP_HOST is set');
    }
    if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)) {
      throw new Error('SMTP_USER and SMTP_PASSWORD must be set together');
    }

    return {
      transport: nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        ...(process.env.SMTP_USER ? {
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        } : {}),
      }),
      from: process.env.MAIL_FROM,
      isEthereal: false,
    };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SMTP_HOST and MAIL_FROM are required in production');
  }

  const account = await nodemailer.createTestAccount();
  return {
    transport: nodemailer.createTransport({
      host: account.smtp.host,
      port: account.smtp.port,
      secure: account.smtp.secure,
      auth: { user: account.user, pass: account.pass },
    }),
    from: account.user,
    isEthereal: true,
  };
}

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) {
    throw new Error('Email recipient, subject, and content are required');
  }

  if (!transportPromise) {
    transportPromise = createTransport().catch((error) => {
      transportPromise = undefined;
      throw error;
    });
  }

  const { transport, from, isEthereal } = await transportPromise;
  const info = await transport.sendMail({ from, to, subject, text, html });

  if (isEthereal) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.info(`Ethereal email preview: ${previewUrl}`);
  }

  return { messageId: info.messageId };
}

module.exports = { sendEmail };
