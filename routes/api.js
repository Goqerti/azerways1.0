// routes/api.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const permissionController = require('../controllers/permissionController');
const orderController = require('../controllers/orderController');
const musicController = require('../controllers/musicController');
const { requireLogin, requireOwnerRole } = require('../middleware/authMiddleware');

// --- Public routes (no login required) ---
router.post('/verify-owner', userController.verifyOwner);
router.post('/users/create', userController.createUser); // Note: still requires owner verification via session flag
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);

// --- Authenticated routes (login required) ---
router.use(requireLogin);

// User & Permissions
router.get('/user/me', userController.getCurrentUser);
router.get('/user/permissions', permissionController.getUserPermissions);
router.get('/permissions', permissionController.getAllPermissions); // Note: requires owner verification via session flag
router.put('/permissions', permissionController.updateAllPermissions); // Note: requires owner verification via session flag

// User Management (Owner only)
router.get('/users', requireOwnerRole, userController.getAllUsers);
router.put('/users/:username', requireOwnerRole, userController.updateUser);
router.delete('/users/:username', requireOwnerRole, userController.deleteUser);

// Orders
router.get('/orders', orderController.getAllOrders);
router.post('/orders', orderController.createOrder);
router.put('/orders/:satisNo', orderController.updateOrder);
router.delete('/orders/:satisNo', orderController.deleteOrder);
router.put('/orders/:satisNo/note', orderController.updateOrderNote);
router.get('/orders/search/rez/:rezNomresi', orderController.searchOrderByRezNo);

// Other resources
router.get('/reservations', orderController.getReservations);
router.get('/reports', orderController.getReports);
router.get('/debts', orderController.getDebts);
router.get('/notifications', orderController.getNotifications);

// Music (New)
router.get('/music/play', musicController.playSong);

module.exports = router;