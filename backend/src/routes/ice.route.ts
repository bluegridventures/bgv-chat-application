import { Router } from "express";
import { getTwilioIceServers } from "../controllers/ice.controller";
import { passportAuthenticateJwt } from "../config/passport.config";

const iceRoutes = Router();
iceRoutes.get("/twilio", passportAuthenticateJwt, getTwilioIceServers);

export default iceRoutes;
