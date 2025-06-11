// controllers/permissionController.js
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

exports.getUserPermissions = (req, res) => {
    const { role } = req.session.user;
    if (role === 'owner') {
        return res.json({ canEditOrder: true, canDeleteOrder: true, canEditFinancials: true });
    }
    const allPermissions = fileStore.getPermissions();
    res.json(allPermissions[role] || {});
};

exports.getAllPermissions = (req, res) => {
    if (!req.session.isOwnerVerified) {
        return res.status(403).json({ message: 'İcazələri görmək üçün Owner parolunu təsdiq etməlisiniz.' });
    }
    res.json(fileStore.getPermissions());
};

exports.updateAllPermissions = (req, res) => {
    if (!req.session.isOwnerVerified) {
        return res.status(403).json({ message: 'Bu əməliyyatı etmək üçün təsdiqlənməlisiniz.' });
    }
    const newPermissions = req.body;
    fileStore.savePermissions(newPermissions);
    telegram.sendLog(telegram.formatLog(req.session.user, `bütün rollar üçün icazələri yenilədi.`));
    res.status(200).json({ message: 'İcazələr uğurla yadda saxlandı.' });
};