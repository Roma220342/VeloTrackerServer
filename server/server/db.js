const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
