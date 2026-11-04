const User = require('../models/User');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const mailer = require('../config/mailer');

const normalizeEmail = (email) => email.trim().toLowerCase();
const emailQuery = (email) => ({
  email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
});
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newVerificationToken = () => crypto.randomBytes(32).toString('hex');
const LOGIN_FAILURE_WINDOW_MS = 3 * 60 * 1000;
//const ACCOUNT_LOCK_MS = 15 * 60 * 1000;
const ACCOUNT_LOCK_MS = 5 * 1000;

function lockedResponse(res, lockUntil) {
  const duration = ACCOUNT_LOCK_MS % (60 * 1000) === 0
    ? `${ACCOUNT_LOCK_MS / (60 * 1000)} minutes`
    : `${Math.ceil(ACCOUNT_LOCK_MS / 1000)} seconds`;
  return res.status(423).json({
    success: false,
    error: `Account is temporarily locked. Please try again after ${duration}.`,
    ...(lockUntil ? { lockedUntil: lockUntil.toISOString() } : {}),
  });
}

async function sendVerificationEmail(email, token) {
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5003}`;
  const url = new URL(`/api/v1/auth/verify-email/${token}`, baseUrl).toString();
  await mailer.sendEmail({
    to: email,
    subject: 'Verify your email address',
    text: `Click this link to verify your email address: ${url}`,
    html: `<p>Click the link below to verify your email address:</p><p><a href="${url}">Verify email</a></p>`,
  });
}

function verificationPage(res, status, message) {
  return res.status(status).type('html').send(
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Email verification</title><body><h1>${message}</h1></body></html>`
  );
}

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, telephone, email, password, role } = req.body || {};

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof telephone !== 'string' || !telephone.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || password.length < 8
    ) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a name, telephone number, valid email, and password of at least 8 characters',
      });
    }

    const normalizedEmail = normalizeEmail(email);
    if (await User.exists(emailQuery(normalizedEmail))) {
      return res.status(409).json({ success: false, error: 'Email is already registered' });
    }

    const verificationToken = newVerificationToken();
    const user = await User.create({
      name: name.trim(),
      telephone: telephone.trim(),
      email: normalizedEmail,
      password,
      role,
      emailVerified: false,
      emailVerificationToken: hashToken(verificationToken),
      emailVerificationSentAt: new Date(),
    });

    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (mailError) {
      console.error(mailError);
      await User.updateOne(
        { _id: user._id, emailVerificationToken: hashToken(verificationToken) },
        { $unset: { emailVerificationSentAt: 1 } }
      );
      return res.status(503).json({
        success: false,
        error: 'Account created, but the verification email could not be sent. Please request a new link.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Check your email to verify your account before logging in.',
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: 'Email is already registered' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: err.message });
    }
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Verify email using the one-time link
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  const { token } = req.params;
  if (!/^[a-f0-9]{64}$/.test(token || '')) {
    return verificationPage(res, 400, 'Invalid verification link');
  }

  try {
    const user = await User.findOneAndUpdate(
      { emailVerificationToken: hashToken(token), emailVerified: false },
      {
        $set: { emailVerified: true },
        $unset: { emailVerificationToken: 1, emailVerificationSentAt: 1 },
      },
      { new: true }
    );
    if (!user) return verificationPage(res, 400, 'Verification link is invalid or already used');
    return verificationPage(res, 200, 'Email verified. You can now log in.');
  } catch (error) {
    console.error(error);
    return verificationPage(res, 500, 'Could not verify email');
  }
};

// @desc    Send another verification link, at most once per minute
// @route   POST /api/v1/auth/resend-verification
// @access  Public
exports.resendVerification = async (req, res) => {
  const { email } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ success: false, error: 'Please provide an email' });
  }

  try {
    const user = await User.findOne(emailQuery(normalizeEmail(email)));
    if (!user || user.emailVerified !== false) {
      return res.status(200).json({
        success: true,
        message: 'If this account needs verification, a link will be sent.',
      });
    }

    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    if (user.emailVerificationSentAt > oneMinuteAgo) {
      return res.status(429).json({ success: false, error: 'Please wait one minute before requesting another link' });
    }

    const token = newVerificationToken();
    const tokenHash = hashToken(token);
    const updated = await User.findOneAndUpdate(
      {
        _id: user._id,
        emailVerified: false,
        $or: [
          { emailVerificationSentAt: { $lte: oneMinuteAgo } },
          { emailVerificationSentAt: { $exists: false } },
        ],
      },
      { $set: { emailVerificationToken: tokenHash, emailVerificationSentAt: now } },
      { new: true }
    );
    if (!updated) {
      return res.status(429).json({ success: false, error: 'Please wait one minute before requesting another link' });
    }

    try {
      await sendVerificationEmail(user.email, token);
    } catch (mailError) {
      console.error(mailError);
      await User.updateOne(
        { _id: user._id, emailVerificationToken: tokenHash },
        { $unset: { emailVerificationSentAt: 1 } }
      );
      return res.status(503).json({ success: false, error: 'Verification email could not be sent. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'Verification link sent' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  const { email, password } = req.body || {};

  // Validate email & password
  if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
    return res.status(400).json({ success: false, error: 'Please provide an email and password' });
  }
  
  try {
    // Check for user
    const user = await User.findOne(emailQuery(normalizeEmail(email))).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return lockedResponse(res, user.lockUntil);
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      const now = new Date();
      const windowStart = new Date(now.getTime() - LOGIN_FAILURE_WINDOW_MS);
      const firstInWindow = {
        $and: [
          { $gte: ['$firstFailedLoginAt', windowStart] },
          { $lte: ['$firstFailedLoginAt', now] },
        ],
      };
      const nextAttempts = {
        $cond: [firstInWindow, { $add: [{ $ifNull: ['$failedLoginAttempts', 0] }, 1] }, 1],
      };
      const updated = await User.findOneAndUpdate(
        {
          _id: user._id,
          $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lte: now } }],
        },
        [{
          $set: {
            failedLoginAttempts: nextAttempts,
            firstFailedLoginAt: { $cond: [firstInWindow, '$firstFailedLoginAt', now] },
            lockUntil: {
              $cond: [
                { $gte: [nextAttempts, 5] },
                new Date(now.getTime() + ACCOUNT_LOCK_MS),
                '$$REMOVE',
              ],
            },
          },
        }],
        { new: true, updatePipeline: true }
      );
      if (!updated || (updated.lockUntil && updated.lockUntil > now)) {
        return lockedResponse(res, updated && updated.lockUntil);
      }
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const now = new Date();
    const cleared = await User.updateOne(
      {
        _id: user._id,
        $or: [{ lockUntil: { $exists: false } }, { lockUntil: { $lte: now } }],
      },
      {
        $set: { failedLoginAttempts: 0 },
        $unset: { firstFailedLoginAt: 1, lockUntil: 1 },
      }
    );
    if (!cleared.matchedCount) return lockedResponse(res);

    if (user.emailVerified === false) {
      return res.status(403).json({ success: false, error: 'Please verify your email before logging in' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    // .cookie('token', token, options)
    .json({
      success: true,
      _id:user._id,
      name: user.name,
      email:user.email,
      token,
    });
};

// @desc    Change password for the current user
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || !currentPassword ||
      typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Please provide your current password and a new password of at least 8 characters',
    });
  }

  if (!req.user?.id) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    if (!await user.matchPassword(currentPassword)) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await User.updateOne(
      { _id: user._id, password: user.password },
      { $set: { password: passwordHash } }
    );
    if (!result.matchedCount) {
      return res.status(409).json({ success: false, error: 'Password changed during this request. Please try again.' });
    }

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
