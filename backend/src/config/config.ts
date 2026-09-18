import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT,
  jwt: {
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET,
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
    accessTokenExpiration: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },
  db: {
    url: process.env.DATABASE_URL,
  },
  node_env: process.env.NODE_ENV,
};
