const pool = require('../db');

//Нова поїздка
const createRide = async (req, res) => {
    const user_id = req.user.user_id;

    //Отримуємо дані від фронту
    const {
        title,
        distance,
        duration,
        avg_speed,
        max_speed,
        start_time,
        notes,
        route_data
    } = req.body;

    try {
        const query = `
            INSERT INTO rides (
                user_id, title, distance, duration, avg_speed, max_speed, start_time, notes, route_data
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const values = [
            user_id,
            title || 'New Ride',
            distance || 0,
            duration || '00:00:00',
            avg_speed || 0,
            max_speed || 0,
            start_time || new Date(),
            notes || '',
            JSON.stringify(route_data)
        ];

        const result = await pool.query(query, values);

        res.status(201).json({
            message: 'Ride saved successfully',
            ride: result.rows[0]
        });
    } catch (err) {
        console.error('Error saving ride:', err.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

//Отрмуємо список поїздок 
const getAllRides = async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const query = `
            SELECT *
            FROM rides
            WHERE user_id = $1
            ORDER BY start_time DESC
        `;

        const result = await pool.query(query, [user_id]);
        res.status(200).json(result.rows);

    } catch (err) {
        console.error('Error fetching rides:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

//Отримаємо деталі конкретної поїздки
const getRideById = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.user_id;

    try {
        const query = 'SELECT * FROM rides WHERE id = $1 AND user_id = $2';
        const result = await pool.query(query, [id, user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.status(200).json(result.rows[0]);

    } catch (err) {
        console.error('Error fetching ride details:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateRide = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.user_id;
    const { title, notes } = req.body; 

    try {
        const query = `
            UPDATE rides 
            SET title = $1, notes = $2
            WHERE id = $3 AND user_id = $4
            RETURNING *
        `;
        
        const result = await pool.query(query, [title, notes, id, user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.status(200).json(result.rows[0]);

    } catch (err) {
        console.error('Error updating ride:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// 4. Видалити поїздку
const deleteRide = async (req, res) => {
    const { id } = req.params;
    const user_id = req.user.user_id;

    try {
        const query = 'DELETE FROM rides WHERE id = $1 AND user_id = $2 RETURNING id';
        const result = await pool.query(query, [id, user_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.status(200).json({ message: 'Ride deleted successfully' });

    } catch (err) {
        console.error('Error deleting ride:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createRide,
    getAllRides,
    getRideById,
    updateRide,
    deleteRide
};
