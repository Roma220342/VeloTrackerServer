const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

const authenticateToken = require('../middleware/authMiddleware');

// Маршрут для реєстрації
router.post('/register', 
    [
        check('name',"Oops! You must enter a name").notEmpty(),
        check('email',"Oops! You must enter a valid email").isEmail(),
        check('password', "Oops! Password must be at least 6 characters long").isLength({min: 6}),
    ], userController.register);

// Маршрут для входу
router.post('/login',
    [
        check('email',"Please enter a valid email").isEmail(),
        check('password', "Please enter a password").exists(),
    ], userController.login);

// Маршрут для google
router.post('/google', userController.googleAuth);

// Маршрут для забутого паролю
router.post('/forgot-password', 
    [
        check('email', "Enter a valid email").isEmail(),
    ],
    userController.forgotPassword);

//Maршрут для перевірки коду
router.post('/verify-code', 
    [
        check('email', "Enter a valid email").isEmail(),
        check('code', "Code is required").notEmpty(),
    ],
    userController.verifyCode);

// Маршрут скидування паролю
router.post('/reset-password', 
    [
        check('email', "Enter a valid email").isEmail(),
        check('code', "Code is required").notEmpty(),
        check('newPassword', "Password must be 6+ chars").isLength({min: 6}),
    ],
    userController.resetPassword);

// Маршрут отримання профілю користувача
router.get('/profile', authenticateToken, userController.getProfile);

// Маршрут для анонімного входу
router.post('/anonymous', userController.loginAnonymously);

// Маршрут для конвертації гостя в користувача
router.put('/convert-guest', authenticateToken, 
    [
        check('email', "Valid email required").isEmail(),
        check('password', "Min 6 chars").isLength({min: 6})
    ],
    userController.convertGuestToUser
);

// Маршрут для прив'язки Google акаунту
router.put('/link-google', authenticateToken, userController.linkGoogleAccount);

module.exports = router;  
