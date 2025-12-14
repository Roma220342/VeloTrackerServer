const express = require('express');
const router = express.Router();
const rideController = require('../controllers/rideController');
const authMiddleware = require('../middleware/authMiddleware');

// Всі маршрути захищені (потрібен токен)
router.use(authMiddleware);

// 1. Зберегти нову поїздку
router.post('/', rideController.createRide);

// 2. Отримати список всіх поїздок
router.get('/', rideController.getAllRides);

// 3. Отримати деталі конкретної поїздки
router.get('/:id', rideController.getRideById);

// 4. Видалити поїздку
router.delete('/:id', rideController.deleteRide);

// 5. Оновити поїздку
router.put('/:id', rideController.updateRide);

module.exports = router;