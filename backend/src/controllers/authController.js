const User = require('../models/User');
const { sendOTP } = require('../services/emailService');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_in_production';

// Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.requestOTP = async (req, res) => {
    const { email, mode } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

        let user = await User.findOne({ email: normalizedEmail });

        if (mode === 'signup' && user) {
            return res.status(400).json({ error: 'Account already exists. Please Sign In.' });
        }

        if (mode === 'login' && !user) {
            return res.status(404).json({ error: 'Account not found. Please Sign Up.' });
        }

        if (!user) {
            // Create user if they don't exist (Signup flow)
            user = new User({ email: normalizedEmail, otpSecret: otp, otpExpires });
        } else {
            // Update OTP for existing user (Login flow)
            user.otpSecret = otp;
            user.otpExpires = otpExpires;
        }

        await user.save();

        // Send OTP via email
        const isSent = await sendOTP(email, otp);
        if (!isSent) {
            return res.status(500).json({ error: 'Failed to send OTP email' });
        }

        // For dev purposes, log the OTP
        console.log(`OTP for ${email}: ${otp}`);

        res.status(200).json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Request OTP Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.verifyOTP = async (req, res) => {
    const { email, otp, publicKey } = req.body;
    if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
    }

    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        console.log(`Verifying OTP for ${normalizedEmail}. Received: [${otp}], Expected: [${user?.otpSecret}]`);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.otpSecret !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        if (new Date() > user.otpExpires) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        // OTP is valid
        user.otpSecret = undefined;
        user.otpExpires = undefined;
        
        // Store public key if provided but ONLY if we aren't branching to 2FA. Wait, safe to store it here.
        if (publicKey) {
            user.publicKey = publicKey;
        }

        await user.save();

        if (user.twoStepPin) {
            return res.status(200).json({ requires2FA: true, email: user.email });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, email: user.email },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            message: 'Authentication successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                profilePicture: user.profilePicture,
                theme: user.theme,
                language: user.language,
                publicKey: user.publicKey,
                readReceipts: user.readReceipts,
                disappearingTimer: user.disappearingTimer
            }
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, displayName, profilePicture, bio } = req.body;
        const user = req.user;

        if (username !== undefined) user.username = username;
        if (displayName !== undefined) user.displayName = displayName;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;
        if (bio !== undefined) user.bio = bio;

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                profilePicture: user.profilePicture,
                bio: user.bio,
                theme: user.theme,
                language: user.language,
                publicKey: user.publicKey,
                readReceipts: user.readReceipts,
                disappearingTimer: user.disappearingTimer
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.verifyPIN = async (req, res) => {
    const { email, pin } = req.body;
    if (!email || !pin) return res.status(400).json({ error: 'Email and PIN required' });

    try {
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.twoStepPin) return res.status(400).json({ error: 'No PIN configured for this account' });

        const isMatch = await bcrypt.compare(pin, user.twoStepPin);
        if (!isMatch) return res.status(400).json({ error: 'Incorrect PIN' });

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

        res.status(200).json({
            message: 'Authentication successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                profilePicture: user.profilePicture,
                theme: user.theme,
                language: user.language,
                publicKey: user.publicKey,
                readReceipts: user.readReceipts,
                disappearingTimer: user.disappearingTimer
            }
        });
    } catch (error) {
        console.error('Verify PIN Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.setupPIN = async (req, res) => {
    try {
        const { pin } = req.body;
        const user = req.user;

        if (!pin) {
            // Remove PIN if empty
            user.twoStepPin = undefined;
        } else {
            const salt = await bcrypt.genSalt(10);
            user.twoStepPin = await bcrypt.hash(pin, salt);
        }

        await user.save();
        res.status(200).json({ message: 'Two-Step Verification updated successfully' });
    } catch (error) {
        console.error('Setup PIN error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.updatePrivacySettings = async (req, res) => {
    try {
        const { readReceipts, disappearingTimer } = req.body;
        const user = req.user;

        if (readReceipts !== undefined) user.readReceipts = readReceipts;
        if (disappearingTimer !== undefined) user.disappearingTimer = disappearingTimer;

        await user.save();
        res.status(200).json({
            message: 'Privacy settings updated',
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                profilePicture: user.profilePicture,
                theme: user.theme,
                language: user.language,
                publicKey: user.publicKey,
                readReceipts: user.readReceipts,
                disappearingTimer: user.disappearingTimer
            }
        });
    } catch (error) {
         res.status(500).json({ error: 'Internal server error' });
    }
};

exports.requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;
        if (!newEmail) return res.status(400).json({ error: 'New email is required' });

        const normalizedEmail = newEmail.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) return res.status(400).json({ error: 'Email already in use' });

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        req.user.pendingEmail = normalizedEmail;
        req.user.emailChangeOTP = otp;
        await req.user.save();

        const isSent = await sendOTP(normalizedEmail, otp);
        if (!isSent) return res.status(500).json({ error: 'Failed to send OTP' });

        console.log(`Email Change OTP for ${normalizedEmail}: ${otp}`);
        res.status(200).json({ message: 'OTP sent to new email' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.verifyEmailChange = async (req, res) => {
    try {
        const { otp } = req.body;
        if (!req.user.pendingEmail || !req.user.emailChangeOTP) {
            return res.status(400).json({ error: 'No email change in progress' });
        }

        if (req.user.emailChangeOTP !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        req.user.email = req.user.pendingEmail;
        req.user.pendingEmail = undefined;
        req.user.emailChangeOTP = undefined;
        await req.user.save();

        res.status(200).json({ 
            message: 'Email updated successfully', 
            email: req.user.email 
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.user._id);
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
