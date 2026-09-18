import jwt, { type JwtPayload } from "jsonwebtoken";
import { type Request, type Response } from "express";
import { compare, hash } from "bcrypt";
import pool from "../../config/db.js";
import {
  createAccessToken,
  createRefreshToken,
  hashToken,
  sendAccessToken,
  sendRefreshToken,
} from "./auth.utils.js";
import { config } from "../../config/config.js";

export const registerUser = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await hash(password, 10);

    await pool.query(
      `
      INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3); 
      `,
      [username, email, hashedPassword],
    );

    res.status(209).json({ message: "User successfully created" });
  } catch (error: any) {
    if (error.code == "23505") {
      return res.status(409).json({ message: "User already exists!" });
    }
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email=$1;",
      [email],
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isPasswordValid = await compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = await createAccessToken(user.id);
    const refreshToken = await createRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const hashedRefreshToken = hashToken(refreshToken);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) 
      VALUES ($1, $2, $3);`,
      [user.id, hashedRefreshToken, expiresAt],
    );

    sendRefreshToken(res, refreshToken);
    return sendAccessToken(res, accessToken, user.email);
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (refreshToken) {
    const hashedRefreshToken = hashToken(refreshToken);
    await pool.query(`DELETE FROM refresh_tokens WHERE token_hash = $1`, [
      hashedRefreshToken,
    ]);
  }
  res.clearCookie("refreshToken", {
    httpOnly: true,
    path: "/",
    secure: config.node_env === "production",
    sameSite: "strict",
  });
  return res.status(200).json({ message: "User logged out" });
};

export const getNewAccessToken = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!refreshToken) {
    return res
      .status(401)
      .json({ accessToken: "", message: "Session expired" });
  }
  const hashedRefreshToken = hashToken(refreshToken);
  try {
    const payload = jwt.verify(
      refreshToken,
      config.jwt.refreshTokenSecret as string,
    ) as JwtPayload;

    const result = await pool.query(
      `SELECT t.id as token_id, t.token_hash, t.expires_at, t.is_revoked, u.id as user_id, u.email 
       FROM refresh_tokens t 
       JOIN users u 
       ON t.user_id = u.id 
       WHERE t.token_hash = $1 AND u.id = $2`,
      [hashedRefreshToken, payload.userId],
    );

    if (result.rowCount === 0) {
      return res
        .status(401)
        .json({ accessToken: "", message: "Session expired" });
    }

    const session = result.rows[0];

    if (session.is_revoked || new Date() > new Date(session.expires_at)) {
      return res
        .status(401)
        .json({ accessToken: "", message: "Session expired" });
    }

    const newAccessToken = await createAccessToken(session.user_id);
    const newRefreshToken = await createRefreshToken(session.user_id);

    const hashedNewRefreshToken = hashToken(newRefreshToken);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE refresh_tokens 
       SET token_hash = $1, expires_at = $2 
       WHERE id = $3`,
      [hashedNewRefreshToken, expiresAt, session.token_id],
    );

    sendRefreshToken(res, newRefreshToken);
    return sendAccessToken(res, newAccessToken, session.email);
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      return res
        .status(401)
        .json({ accessToken: "", message: "Refresh token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(401)
        .json({ accessToken: "", message: "Invalid refresh token." });
    }
    console.error("Unexpected error in getNewAccessToken:", error);
    return res
      .status(500)
      .json({ accessToken: "", message: "Internal server error" });
  }
};
