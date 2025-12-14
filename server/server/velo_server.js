const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const rideRoutes = require('./routes/rideRoutes'); 
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' })); 
app.use(cors());

// Підключення маршрутів
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes); 

// Глобальна обробка помилок
app.use((err, req, res, next) => {
    console.log(`ВХІДНИЙ ЗАПИТ: ${req.method} ${req.url}`);
    console.log('Тіло запиту:', req.body);
    next(); 
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});