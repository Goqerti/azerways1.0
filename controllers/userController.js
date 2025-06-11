// controllers/userController.js
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const fileStore = require('../services/fileStore');
const telegram = require('../services/telegramService');

// --- Mail Service Setup ---
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: parseInt(process.env.EMAIL_PORT || "587") === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- Authentication ---
exports.login = (req, res) => {
    const { username, password } = req.body;
    const users = fileStore.getUsers();
    const user = users[username];
    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.user = { username, role: user.role, displayName: user.displayName };
        telegram.sendLog(telegram.formatLog(req.session.user, 'sistemə daxil oldu.'));
        res.redirect('/');
    } else {
        res.redirect('/login.html?error=true');
    }
};

exports.logout = (req, res) => {
    if (req.session.user) {
        telegram.sendLog(telegram.formatLog(req.session.user, 'sistemdən çıxış etdi.'));
    }
    req.session.destroy(err => {
        if (err) return res.redirect('/?logoutFailed=true');
        res.clearCookie('connect.sid');
        res.redirect('/login.html');
    });
};

exports.getCurrentUser = (req, res) => res.json(req.session.user);


// --- Password Reset ---
exports.forgotPassword = (req, res) => {
    const { username } = req.body;
    const users = fileStore.getUsers();
    const user = users[username];

    if (!user || !user.email) {
        return res.status(404).json({ message: "Bu istifadəçi adı ilə əlaqəli e-poçt ünvanı tapılmadı." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;
    req.session.otpData = { username, otp, expires };

    const mailOptions = {
        from: `"Azerweys Admin Panel" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Şifrə Sıfırlama Kodu',
        html: `<p>Salam, ${user.displayName}.</p><p>Şifrənizi sıfırlamaq üçün təsdiq kodunuz: <b>${otp}</b></p><p>Bu kod 10 dəqiqə ərzində etibarlıdır.</p>`
    };
    
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("!!! MAIL GÖNDƏRMƏ XƏTASI !!!\n", error);
            return res.status(500).json({ message: "OTP kodu göndərilərkən xəta baş verdi." });
        }
        res.status(200).json({ message: `Təsdiq kodu ${user.email} ünvanına göndərildi.` });
    });
};

exports.resetPassword = (req, res) => {
    const { username, otp, newPassword } = req.body;
    const otpData = req.session.otpData;

    if (!otpData || otpData.username !== username || otpData.otp !== otp) {
        return res.status(400).json({ message: "OTP kod yanlışdır." });
    }
    if (Date.now() > otpData.expires) {
        return res.status(400).json({ message: "OTP kodunun vaxtı bitib." });
    }
    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Yeni şifrə ən az 6 simvoldan ibarət olmalıdır." });
    }

    try {
        const users = fileStore.getUsers();
        if (!users[username]) return res.status(404).json({ message: "İstifadəçi tapılmadı." });
        
        const salt = bcrypt.genSaltSync(10);
        users[username].password = bcrypt.hashSync(newPassword, salt);
        
        fileStore.saveAllUsers(users);
        
        delete req.session.otpData;
        
        telegram.sendLog(telegram.formatLog({displayName: username, role: users[username].role}, `mail vasitəsilə şifrəsini yenilədi.`));
        res.status(200).json({ message: "Şifrəniz uğurla yeniləndi." });

    } catch (error) {
        res.status(500).json({ message: "Şifrə yenilənərkən server xətası baş verdi." });
    }
};


// --- User Management (Owner only) ---

exports.verifyOwner = (req, res) => {
    const { password } = req.body;
    const users = fileStore.getUsers();
    const owner = Object.values(users).find(u => u.role === 'owner');
    
    if (owner && bcrypt.compareSync(password, owner.password)) {
        req.session.isOwnerVerified = true;
        res.status(200).json({ success: true });
    } else {
        res.status(401).json({ message: 'Parol yanlışdır' });
    }
};

exports.createUser = (req, res) => {
    if (!req.session.isOwnerVerified) {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }
    const { username, password, displayName, email, role } = req.body;
    if (!username || !password || !displayName || !role || !email) {
        return res.status(400).json({ message: 'Bütün xanaları doldurun.' });
    }
    try {
        const users = fileStore.getUsers();
        if (users[username]) {
            return res.status(409).json({ message: 'Bu istifadəçi adı artıq mövcuddur.' });
        }
        fileStore.addUser({ username, password, displayName, email, role });

        const permissions = fileStore.getPermissions();
        if (!permissions[role]) {
            permissions[role] = { canEditOrder: false, canEditFinancials: false, canDeleteOrder: false };
            fileStore.savePermissions(permissions);
        }
        
        telegram.sendLog(telegram.formatLog(req.session.user, `<b>${displayName} (${role})</b> adlı yeni istifadəçi yaratdı.`));
        res.status(201).json({ message: 'Yeni istifadəçi uğurla yaradıldı!' });

    } catch (error) {
        console.error("İstifadəçi yaradarkən xəta:", error);
        res.status(500).json({ message: 'İstifadəçi yaradılarkən server xətası baş verdi.' });
    }
};

exports.getAllUsers = (req, res) => {
    if (req.session.user?.role !== 'owner') {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }
    const users = fileStore.getUsers();
    // Remove password before sending to client
    const safeUsers = Object.entries(users).map(([username, data]) => ({
        username,
        displayName: data.displayName,
        email: data.email,
        role: data.role
    }));
    res.json(safeUsers);
};

exports.updateUser = (req, res) => {
    if (req.session.user?.role !== 'owner') {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }
    const { username } = req.params;
    const { displayName, email, role, newPassword } = req.body;

    try {
        let users = fileStore.getUsers();
        if (!users[username]) {
            return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
        }

        users[username].displayName = displayName || users[username].displayName;
        users[username].email = email || users[username].email;
        users[username].role = role || users[username].role;

        if (newPassword && newPassword.length >= 6) {
            const salt = bcrypt.genSaltSync(10);
            users[username].password = bcrypt.hashSync(newPassword, salt);
        }
        
        fileStore.saveAllUsers(users);
        telegram.sendLog(telegram.formatLog(req.session.user, `<b>${username}</b> adlı istifadəçinin məlumatlarını yenilədi.`));
        res.status(200).json({ message: 'İstifadəçi məlumatları yeniləndi.' });
    } catch (error) {
        res.status(500).json({ message: 'Server xətası baş verdi.' });
    }
};

exports.deleteUser = (req, res) => {
    if (req.session.user?.role !== 'owner') {
        return res.status(403).json({ message: 'Bu əməliyyatı etməyə icazəniz yoxdur.' });
    }
    const { username } = req.params;
    
    // Prevent owner from deleting themselves
    if (username === req.session.user.username) {
        return res.status(400).json({ message: 'Owner öz hesabını silə bilməz.' });
    }

    try {
        let users = fileStore.getUsers();
        if (!users[username]) {
            return res.status(404).json({ message: 'İstifadəçi tapılmadı.' });
        }
        const deletedUserDisplayName = users[username].displayName;
        delete users[username];
        fileStore.saveAllUsers(users);
        telegram.sendLog(telegram.formatLog(req.session.user, `<b>${deletedUserDisplayName} (${username})</b> adlı istifadəçini sildi.`));
        res.status(200).json({ message: 'İstifadəçi silindi.' });
    } catch (error) {
        res.status(500).json({ message: 'Server xətası baş verdi.' });
    }
};