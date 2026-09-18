import { Pool } from "pg";
import { config } from "./config.js";

const pool = new Pool({ connectionString: config.db.url });

export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log("Client connected successfully!");
    client.release();
  } catch (err: any) {
    console.error(err);
  }
};

export default pool;
