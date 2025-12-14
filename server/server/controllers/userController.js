const pool = require('../db');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const sendResetEmail = require('../services/emailService');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Генерація JWT
const generateAccessToken = (user) => {
    const payload = {
        user_id: user.id,
        name: user.name,
        email: user.email,
    };

    const secret = process.env.SECRET_KEY;
    if (!secret) {
        throw new Error('SECRET_KEY is not defined in the .env file.');
    }

    return jwt.sign(payload, secret, { expiresIn: '7d' }); 
};

// --- Реєстрація ---
const register = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, password, email } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userCheck.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (name, password, email) VALUES ($1, $2, $3) RETURNING *';
        const newUserResult = await pool.query(query, [name, hashedPassword, email]);

        const newUser = newUserResult.rows[0];
        const token = generateAccessToken(newUser);

        res.status(201).json({ 
            message: 'User successfully registered',
            token,
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });

    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).json({ error: 'An error occurred during registration' });
    }
};

// --- Логін ---
const login = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password } = req.body;

        const usersResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (usersResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = usersResult.rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = generateAccessToken(user);

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ message: 'Server error during login' });
    }
};

// --- Google Auth ---
const googleAuth = async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID, 
        });
        
        const payload = ticket.getPayload();
        const { email, name } = payload; 

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        let user;

        if (userCheck.rows.length > 0) {
            user = userCheck.rows[0];
        } else {
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const newUserQuery = `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`;
            const newUserResult = await pool.query(newUserQuery, [name, email, hashedPassword]);
            user = newUserResult.rows[0];
        }

        const accessToken = generateAccessToken(user);

        res.status(200).json({
            message: 'Google login successful',
            token: accessToken,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ message: 'Invalid Google token' });
    }
};

// --- Відновлення паролю: Крок 1 (Send Code) ---
const forgotPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'No user with this email found' });
        }

        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await pool.query(
            'UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE email = $3',
            [code, expiresAt, email]
        );

        await sendResetEmail(email, code);

        res.json({ message: 'Recovery code sent to your email' });

    } catch (err) {
        console.error('Error forgotPassword', err);
        res.status(500).json({ message: 'Server error sending code' });      
    }  
};

// --- Відновлення паролю: Крок 2 (Verify Code) ---
const verifyCode = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, code } = req.body;

    try {
        const result = await pool.query(
            `SELECT * FROM users 
             WHERE email = $1 
             AND reset_code = $2 
             AND reset_code_expires > NOW()`,
            [email, code]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid code or expired code'
            });
        }

        res.json({ success: true, message: 'The code is confirmed' });
    } catch (err) {
        console.error('Помилка verifyCode:', err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// --- Відновлення паролю: Крок 3 (Reset Password) ---
const resetPassword = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, code, newPassword } = req.body;

    try {
        const checkResult = await pool.query(
            `SELECT * FROM users 
             WHERE email = $1 
             AND reset_code = $2 
             AND reset_code_expires > NOW()`,
            [email, code]
        );

        if (checkResult.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid recovery request.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await pool.query(
            `UPDATE users 
             SET password = $1, reset_code = NULL, reset_code_expires = NULL 
             WHERE email = $2`,
            [hashedPassword, email]
        );

        res.json({ message: 'Password changed successfully. You can now login.' });

    } catch (err) {
        console.error('Помилка resetPassword:', err);
        res.status(500).json({ message: 'Server error changing password.' });
    }
};

const getProfile = async (req, res) => {
    try {
        const userId = req.user.user_id; 

        const userResult = await pool.query(
            'SELECT id, name, email FROM users WHERE id = $1', 
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(userResult.rows[0]);

    } catch (err) {
        console.error('Get Profile Error:', err.message);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
};

const loginAnonymously = async (req, res) => {
    try {
        const uniqueId = Date.now().toString() + Math.floor(Math.random() * 1000);

        const guestEmail =`guest_${uniqueId}@velotracker.anon`;
        const guestName = `Guest_${uniqueId}`;

        const guestPassword = await bcrypt.hash(`guest_pass_${uniqueId}`, 10);
            
        const query = 'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *';

        const newUserResult = await pool.query(query, [guestName, guestEmail, guestPassword]);

        const user = newUserResult.rows[0];

        const token = generateAccessToken(user);

        res.status(201).json({ 
            message: 'Guest login successful',
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (err) {
        console.error('Anonymous Login Error:', err.message);
        res.status(500).json({ message: 'Server error during guest login' });
    }
};

const convertGuestToUser = async (req, res) => {
    const userId = req.user.user_id; // Беремо ID з поточного токена гостя
    const { name, email, password } = req.body;

    try {
        // 1. Перевіряємо, чи не зайнятий вже цей email кимось іншим
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'This email is already in use' });
        }

        // 2. Хешуємо новий пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. ОНОВЛЮЄМО існуючий запис гостя
        const query = `
            UPDATE users 
            SET name = $1, email = $2, password = $3 
            WHERE id = $4 
            RETURNING id, name, email
        `;
        
        const result = await pool.query(query, [name, email, hashedPassword, userId]);

        // 4. Генеруємо НОВИЙ токен (бо в старому зашитий старий email/name)
        const user = result.rows[0];
        const newToken = generateAccessToken(user);

        res.status(200).json({
            message: 'Account registered successfully',
            token: newToken,
            user: user
        });

    } catch (err) {
        console.error('Convert Guest Error:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const linkGoogleAccount = async (req, res) => {
    const userId = req.user.user_id; 
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { email, name } = ticket.getPayload();

        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
             return res.status(400).json({ message: 'This Google account is already registered.' });
        }

        const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        const query = `
            UPDATE users
            SET name = $1, email = $2, password = $3
            WHERE id = $4
            RETURNING *
        `;
        const result = await pool.query(query, [name, email, hashedPassword, userId]);
        const user = result.rows[0];

        const newToken = generateAccessToken(user);

        res.status(200).json({
            message: 'Account linked to Google successfully',
            token: newToken,
            user: { id: user.id, name: user.name, email: user.email }
        });

    } catch (error) {
        console.error('Link Google Error:', error);
        res.status(500).json({ message: 'Server error linking Google account' });
    }
};

module.exports = {
    register,
    login,
    googleAuth,
    forgotPassword,
    verifyCode,
    getProfile,
    resetPassword,
    convertGuestToUser,
    linkGoogleAccount,
    loginAnonymously
};