const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // Логування заголовка Authorization
        console.log('Authorization Header:', authHeader);

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Відсутній або некоректний токен авторизації.' });
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.SECRET_KEY;

        if (!secret) {
            throw new Error('SECRET_KEY не визначено в .env файлі.');
        }

        const decoded = jwt.verify(token, secret);

        req.user = decoded;

        next();
    } catch (err) {
        console.error('Помилка авторизації:', err.message);
        res.status(401).json({ message: 'Невалідний або прострочений токен.' });
    }
};

module.exports = authMiddleware;
