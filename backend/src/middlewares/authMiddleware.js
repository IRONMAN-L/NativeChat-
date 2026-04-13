const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_change_in_production';

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-otpSecret -otpExpires');
        
        if (!req.user) {
            return res.status(401).json({ error: 'User no longer exists' });
        }
        
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Not authorized, token failed' });
    }
};
