import express from 'express';
import {db} from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`Hello from DB service running on port ${PORT}`);
});

app.get('/retrieve', (req, res) => {
  const { key } = req.query;
  res.send(`Hello from DB service running on port ${PORT}`);
});

//dockers bridge network - accept requests from external connections
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://0.0.0.0:${PORT}/`);
});

