/* eslint no-console: off */
import cors from 'cors';
import dotenv from 'dotenv';
import express, { Application } from 'express';
import logger from 'morgan';
import connectDB from './config/mongodb';
import routes from './routes';

dotenv.config();
const corsOriginUrl = process.env.CORS_ORIGIN_URL;
if (!corsOriginUrl) throw new Error('CORS origin url is missing');
const mongodbUrl = process.env.MONGODB_URL;
if (!mongodbUrl) throw new Error('MongoDB url is missing');

const app: Application = express();
const port = process.env.PORT || 8000;

app.use(cors({ origin: corsOriginUrl, credentials: true }));
app.use(logger('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use('/api/v1', routes);

(async () => {
  try {
    connectDB(mongodbUrl);
    app.listen(port, () => console.log(`Server started on http://localhost:${port}`));
  } catch (err) {
    console.log(err);
  }
})();
