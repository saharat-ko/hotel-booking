const dotenv = require('dotenv');
const { sendEmail } = require('../config/mailer');

dotenv.config({ path: './config/config.env' });

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run test:email -- recipient@example.com');
  process.exitCode = 1;
} else {
  sendEmail({
    to,
    subject: 'Hotel booking email test',
    text: 'This is a test email from the hotel booking backend.',
  }).then(() => {
    console.log('Test email sent.');
  }).catch((error) => {
    console.error(`Email test failed: ${error.message}`);
    process.exitCode = 1;
  });
}
