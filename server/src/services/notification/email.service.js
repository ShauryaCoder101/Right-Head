const nodemailer = require('nodemailer');
const { config } = require('../../config/env');

let transporter = null;

/**
 * Get or create the email transporter
 * In development, uses ethereal (fake SMTP) or console logging
 */
async function getTransporter() {
  if (transporter) return transporter;

  if (config.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // In development, create an ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  return transporter;
}

/**
 * Send a transactional email
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML body
 * @param {string} [options.text] - Plain text fallback
 * @returns {Promise<object>} Send result
 */
async function sendEmail({ to, subject, html, text }) {
  if (config.NODE_ENV !== 'production') {
    console.log('\n📧 [DEV EMAIL]');
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body: ${text || html.substring(0, 200)}...`);
    console.log('');
    return { messageId: `dev-${Date.now()}`, accepted: [to] };
  }

  const transport = await getTransporter();
  const result = await transport.sendMail({
    from: process.env.EMAIL_FROM || '"RecruitIQ" <noreply@recruitiq.io>',
    to,
    subject,
    html,
    text,
  });

  if (config.NODE_ENV !== 'production') {
    console.log(`📧 Preview URL: ${nodemailer.getTestMessageUrl(result)}`);
  }

  return result;
}

/**
 * Send batch completion notification email
 */
async function sendBatchCompleteEmail(to, jdTitle, candidateCount, avgScore) {
  return sendEmail({
    to,
    subject: `✅ Screening Complete: ${jdTitle}`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 32px; border-radius: 12px;">
        <h1 style="color: #3b82f6; margin: 0 0 16px;">🧠 RecruitIQ</h1>
        <h2 style="margin: 0 0 24px;">Screening Complete</h2>
        <p>Your screening for <strong>${jdTitle}</strong> has finished.</p>
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>${candidateCount}</strong> candidates scored</p>
          <p style="margin: 4px 0;">Average score: <strong>${avgScore}</strong>/100</p>
        </div>
        <a href="${process.env.APP_URL || 'http://localhost:5173'}/dashboard" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">View Results</a>
      </div>
    `,
    text: `Screening Complete: ${jdTitle}. ${candidateCount} candidates scored. Average score: ${avgScore}/100.`,
  });
}

/**
 * Send data deletion confirmation email
 */
async function sendDataDeletionEmail(to) {
  return sendEmail({
    to,
    subject: 'Your data deletion request has been received — RecruitIQ',
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #3b82f6;">🧠 RecruitIQ</h1>
        <h2>Data Deletion Request Received</h2>
        <p>We have received your request to delete your data from our system.</p>
        <p>Your data will be permanently removed within <strong>30 days</strong>.</p>
        <p>If you did not make this request, please contact our support team immediately.</p>
      </div>
    `,
    text: 'Your data deletion request has been received. Your data will be permanently removed within 30 days.',
  });
}

/**
 * Send verification code email
 */
async function sendVerificationCodeEmail(to, code) {
  return sendEmail({
    to,
    subject: `Your verification code: ${code} — RecruitIQ`,
    html: `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
        <h1 style="color: #3b82f6;">🧠 RecruitIQ</h1>
        <h2>Verification Code</h2>
        <p>Your verification code is:</p>
        <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a;">${code}</span>
        </div>
        <p>This code expires in 10 minutes.</p>
      </div>
    `,
    text: `Your RecruitIQ verification code is: ${code}. This code expires in 10 minutes.`,
  });
}

module.exports = {
  sendEmail,
  sendBatchCompleteEmail,
  sendDataDeletionEmail,
  sendVerificationCodeEmail,
};
