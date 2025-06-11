// update_passwords.js
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.txt');
const NEW_USERS_FILE = path.join(__dirname, 'users_new.txt');

console.log('Şifrə yeniləmə skripti başladı...');

try {
    // Köhnə faylı oxu
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const lines = data.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
        console.log('users.txt faylı boşdur. Heç bir dəyişiklik edilmədi.');
        return;
    }

    // Hər bir sətirdəki şifrəni hash-lə
    const updatedLines = lines.map(line => {
        const parts = line.split(':');
        if (parts.length < 5) {
            console.warn(`Səhv formatlı sətir ötürüldü: "${line}"`);
            return line; // Səhv formatlı sətiri dəyişmədən qaytar
        }

        const [username, password, role, displayName, ...emailParts] = parts;
        
        // Əgər şifrə artıq hash-lənibsə (bcrypt formatındadırsa), ona toxunma
        if (password.startsWith('$2b$')) {
            console.log(`"${username}" üçün şifrə artıq hash-lənib, ötürülür...`);
            return line;
        }

        // Açıq mətndəki şifrəni hash-lə
        console.log(`"${username}" üçün şifrə hash-lənir...`);
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);
        
        return `${username}:${hashedPassword}:${role}:${displayName}:${emailParts.join(':')}`;
    });

    // Yeni fayla yaz
    fs.writeFileSync(NEW_USERS_FILE, updatedLines.join('\n') + '\n', 'utf-8');

    console.log('----------------------------------------------------');
    console.log('✓ Uğurlu Əməliyyat!');
    console.log(`Yeni şifrələr "users_new.txt" faylına yazıldı.`);
    console.log('İndi köhnə "users.txt" faylını silib, "users_new.txt" faylının adını "users.txt" olaraq dəyişin.');
    console.log('----------------------------------------------------');

} catch (error) {
    console.error('Şifrələri yeniləyərkən kritik xəta baş verdi:', error);
}