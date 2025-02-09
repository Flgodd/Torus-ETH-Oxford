import pkg from 'pg';
const { Pool } = pkg;

import 'dotenv/config';

const pool = new Pool({
  user: "myuser", //process.env.PG_USER
  password: "mypassword",//process.env.PG_PASSWORD
  host: "localhost",//process.env.PG_HOST
  database: "mydatabase", //process.env.PG_DATABASE
  port: "5432",//process.env.PG_PORT
});

export default pool;