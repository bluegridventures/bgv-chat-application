import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { Env } from "../config/env.config";
import twilio from "twilio";

export const getTwilioIceServers = asyncHandler(async (_req: Request, res: Response) => {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET,
  } = Env;

  if (!TWILIO_ACCOUNT_SID || (!TWILIO_AUTH_TOKEN && !(TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET))) {
    return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
      message: "Twilio credentials missing (need Account SID + Auth Token, or API Key SID/Secret + Account SID)",
    });
  }

  let client: ReturnType<typeof twilio>;
  if (TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET) {
    client = twilio(TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, { accountSid: TWILIO_ACCOUNT_SID });
  } else {
    client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }

  const token = await client.tokens.create({ ttl: 3600 });
  // twilio returns iceServers
  const iceServers = (token as any).iceServers || (token as any).ice_servers || [];

  return res.status(HTTPSTATUS.OK).json({ iceServers });
});
