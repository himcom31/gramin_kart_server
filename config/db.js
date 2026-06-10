const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host:     process.env.MYSQL_HOST     || 'localhost',
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'mydb',
    port:     process.env.MYSQL_PORT     || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectDB = async () => {
    try {
        const connection = await pool.getConnection();
        console.log("MySQL Connected...");
        connection.release();
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

module.exports = { connectDB, pool };