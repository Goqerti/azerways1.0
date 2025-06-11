// middleware/authMiddleware.js

exports.requireLogin = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    // For API requests, send a JSON error. Otherwise, redirect.
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ message: 'Sessiya bitib və ya giriş edilməyib.' });
    }
    return res.redirect('/login.html');
};

exports.requireOwnerRole = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'owner') {
        return next();
    }
    return res.status(403).json({ message: 'Bu əməliyyatı etməyə yalnız "Owner" icazəlidir.' });
};