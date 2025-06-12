// controllers/permissionController.js
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');
const bcrypt = require('bcrypt');

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

exports.getPermissionsByPassword = (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Parol daxil edilməyib.' });
    }

    const users = fileStore.getUsers();
    const owner = Object.values(users).find(u => u.role === 'owner');

    if (!owner) {
        return res.status(500).json({ message: 'Sistemdə "Owner" tapılmadı.' });
    }

    if (bcrypt.compareSync(password, owner.password)) {
        // Parol düzgündürsə, icazələri qaytar
        const permissions = fileStore.getPermissions();
        res.status(200).json(permissions);
    } else {
        // Parol səhvdirsə, 401 xətası qaytar
        res.status(401).json({ message: 'Parol yanlışdır.' });
    }
};

exports.savePermissionsByPassword = (req, res) => {
    const { password, permissions } = req.body;

    if (!password || !permissions) {
        return res.status(400).json({ message: 'Parol və ya icazə məlumatları göndərilməyib.' });
    }

    const users = fileStore.getUsers();
    const owner = Object.values(users).find(u => u.role === 'owner');

    if (!owner) {
        return res.status(500).json({ message: 'Sistemdə "Owner" tapılmadı.' });
    }

    if (bcrypt.compareSync(password, owner.password)) {
        // Parol düzgündürsə, icazələri yadda saxla
        fileStore.savePermissions(permissions);
        
        // Logu göndərmək üçün "owner" istifadəçisini təmsil edən obyekt yaradırıq
        const ownerUserObject = {
            username: Object.keys(users).find(u => users[u].role === 'owner'),
            displayName: owner.displayName,
            role: 'owner'
        };
        telegram.sendLog(telegram.formatLog(ownerUserObject, `parol təsdiqi ilə bütün rollar üçün icazələri yenilədi.`));
        
        res.status(200).json({ message: 'İcazələr uğurla yadda saxlandı.' });
    } else {
        // Parol səhvdirsə
        res.status(401).json({ message: 'Parol yanlışdır. Dəyişikliklər yadda saxlanılmadı.' });
    }
};
