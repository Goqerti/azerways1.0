// services/fileStore.js
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DB_FILE = path.join(__dirname, '..', 'sifarişlər.txt');
const USERS_FILE = path.join(__dirname, '..', 'users.txt');
const PERMISSIONS_FILE = path.join(__dirname, '..', 'permissions.json');
const CHAT_HISTORY_FILE = path.join(__dirname, '..', 'chat_history.txt');

// --- Generic Read/Write Functions ---
const readFileLines = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf-8');
    return data.trim().split('\n').filter(Boolean);
};

const readJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
};

const writeJsonFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
};

const writeLinesToFile = (filePath, lines) => {
    fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
};

const appendLineToFile = (filePath, line) => {
    fs.appendFileSync(filePath, line + '\n', 'utf-8');
};

// --- Order Functions ---
const getOrders = () => readFileLines(DB_FILE).map(line => JSON.parse(line));
const saveAllOrders = (orders) => writeLinesToFile(DB_FILE, orders.map(o => JSON.stringify(o)));

// --- User Functions ---
const getUsers = () => {
    const lines = readFileLines(USERS_FILE);
    const users = {};
    lines.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 5) {
            const [username, password, role, displayName, ...emailParts] = parts;
            users[username.trim()] = { password: password.trim(), role: role.trim(), displayName: displayName.trim(), email: emailParts.join(':').trim() };
        }
    });
    return users;
};

const saveAllUsers = (users) => {
    const lines = Object.entries(users).map(([username, data]) => 
        `${username}:${data.password}:${data.role}:${data.displayName}:${data.email}`
    );
    writeLinesToFile(USERS_FILE, lines);
};

const addUser = (userData) => {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);
    const newUserLine = `${userData.username}:${hashedPassword}:${userData.role}:${userData.displayName}:${userData.email}`;
    appendLineToFile(USERS_FILE, newUserLine);
};


// --- Permissions Functions ---
const getPermissions = () => readJsonFile(PERMISSIONS_FILE) || {};
const savePermissions = (permissions) => writeJsonFile(PERMISSIONS_FILE, permissions);


// --- Chat Functions ---
const getChatHistory = () => readFileLines(CHAT_HISTORY_FILE).map(line => JSON.parse(line));
const appendToChatHistory = (message) => appendLineToFile(CHAT_HISTORY_FILE, JSON.stringify(message));

module.exports = {
    getOrders,
    saveAllOrders,
    getUsers,
    addUser,
    saveAllUsers,
    getPermissions,
    savePermissions,
    getChatHistory,
    appendToChatHistory
};