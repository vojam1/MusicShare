import express, { type Response, type Request } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import pool, { connectDB } from "./config/db.js";
import { config } from "./config/config.js";
import authRoutes from "./modules/auth/auth.routes.js";

const server = express();
const PORT = config.port || 3003;

server.get("/", (_req: Request, res: Response) => {
  res.send("Hello World!");
});

server.use(cookieParser());
server.use(
  cors({
    origin: "http://localhost:3003",
    credentials: true,
  }),
);

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

server.use("/auth", authRoutes);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("Server running on port " + PORT + "!");
    });
  })
  .catch(() => {
    console.error("Failed to connect to database.");
  });
