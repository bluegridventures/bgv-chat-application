import { Router } from "express";
import authRoutes from "./auth.route";
import chatRoutes from "./chat.route";
import userRoutes from "./user.route";
import groupRoutes from "./group.route";
import rtcRoutes from "./rtc.route";
import iceRoutes from "./ice.route";

const router = Router();
router.use("/auth", authRoutes);
router.use("/chat", chatRoutes);
router.use("/user", userRoutes);
router.use("/group", groupRoutes);
router.use("/rtc", rtcRoutes);
router.use("/ice", iceRoutes);

export default router;
