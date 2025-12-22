const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

if (!connectionString && isProduction) {
  throw new Error('DATABASE_URL is missing in production environment!');
}

const pool = new Pool({
  connectionString: connectionString, // Використовуємо довге посилання
  ssl: isProduction ? { rejectUnauthorized: false } : false // Вмикаємо SSL тільки на сервері
});

// Перевірка з'єднання
pool.connect((err, client, release) => {
    if (err) {
        return console.error("Халепа до Бд не підключаємс: " + err.message);
    } else {
        console.log("Юхуу! Сервер підключився");
       release();
    }
});

module.exports = pool;





