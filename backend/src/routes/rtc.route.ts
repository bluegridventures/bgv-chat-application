import { Router } from "express";
import { getRtcTokenController } from "../controllers/rtc.controller";
import { passportAuthenticateJwt } from "../config/passport.config";

const rtcRoutes = Router();

rtcRoutes.post("/token", passportAuthenticateJwt, getRtcTokenController);

export default rtcRoutes;
