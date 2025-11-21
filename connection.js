const { text } = require('express');
const { Pool } = require('pg');
require('dotenv').config(); 

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: 5432,
  ssl: true
});

module.exports = {
  query: (text, params) => pool.query(text, params)
};
