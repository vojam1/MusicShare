import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  getNewAccessToken,
} from "./auth.controller.js";

const router = Router();

router.post("/login", loginUser);
router.post("/register", registerUser);
router.post("/logout", logoutUser);
router.post("/refresh_token", getNewAccessToken);

export default router;
