import type { Response } from "express";
import { config } from "../../config/config.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const createAccessToken = async (userId: string | number) => {
  const secret = config.jwt.accessTokenSecret;
  if (!secret) {
    throw new Error(
      "ACCESS_TOKEN_SECRET is not defined in enviroment variables",
    );
  }

  return jwt.sign({ userId }, secret!, {
    expiresIn: config.jwt.accessTokenExpiration as any,
  });
};

export const createRefreshToken = async (userId: string | number) => {
  const secret = config.jwt.refreshTokenSecret;
  if (!secret) {
    throw new Error(
      "REFRESH_TOKEN_SECRET is not defined in enviroment variables",
    );
  }

  return jwt.sign({ userId }, secret!, {
    expiresIn: config.jwt.refreshTokenExpiration as any,
  });
};

export const sendAccessToken = (
  res: Response,
  accessToken: string,
  email: string,
) => {
  res.json({
    accessToken,
    email,
  });
};

export const sendRefreshToken = (res: Response, refreshToken: string) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    path: "/",
    secure: config.node_env === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, //7 days in miliseconds,
  });
};

export const hashToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
