import { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config";
import {
  createChatController,
  getSingleChatController,
  getUserChatsController,
  deleteChatController,
} from "../controllers/chat.controller";
import {
  deleteMessageController,
  editMessageController,
  reactMessageController,
  sendMessageController,
} from "../controllers/message.controller";

const chatRoutes = Router()
  .use(passportAuthenticateJwt)
  .post("/create", createChatController)
  .post("/message/send", sendMessageController)
  .post("/message/react", reactMessageController)
  .patch("/message/edit", editMessageController)
  .delete("/message/delete", deleteMessageController)
  .get("/all", getUserChatsController)
  .get("/:id", getSingleChatController)
  .delete("/:id", deleteChatController);

export default chatRoutes;
