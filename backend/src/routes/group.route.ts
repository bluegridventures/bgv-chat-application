import { Router } from "express";
import { passportAuthenticateJwt } from "../config/passport.config";
import {
  createGroupController,
  updateGroupController,
  addGroupMemberController,
  removeGroupMemberController,
  leaveGroupController,
} from "../controllers/group.controller";

const groupRoutes = Router()
  .use(passportAuthenticateJwt)
  .post("/create", createGroupController)
  .put("/:chatId", updateGroupController)
  .post("/:chatId/members", addGroupMemberController)
  .delete("/:chatId/members/:memberId", removeGroupMemberController)
  .post("/:chatId/leave", leaveGroupController);

export default groupRoutes;
