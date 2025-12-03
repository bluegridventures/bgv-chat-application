import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { loginService, registerService } from "../services/auth.service";
import { clearJwtAuthCookie, setJwtAuthCookie } from "../utils/cookie";
import { HTTPSTATUS } from "../config/http.config";
import jwt from "jsonwebtoken";
import { Env } from "../config/env.config";

export const registerController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = registerSchema.parse(req.body);

    const user = await registerService(body);
    const userId = user.id;
    const token = jwt.sign(
      { userId },
      Env.JWT_SECRET,
      {
        audience: ["user"],
        expiresIn: (Env.JWT_EXPIRES_IN as any) || "7d",
        algorithm: "HS256",
      }
    );

    return setJwtAuthCookie({
      res,
      userId,
    })
      .status(HTTPSTATUS.CREATED)
      .json({
        message: "User created & login successfully",
        user,
        token,
      });
  }
);

export const loginController = asyncHandler(
  async (req: Request, res: Response) => {
    const body = loginSchema.parse(req.body);

    const user = await loginService(body);
    const userId = user.id;
    const token = jwt.sign(
      { userId },
      Env.JWT_SECRET,
      {
        audience: ["user"],
        expiresIn: (Env.JWT_EXPIRES_IN as any) || "7d",
        algorithm: "HS256",
      }
    );
    return setJwtAuthCookie({
      res,
      userId,
    })
      .status(HTTPSTATUS.OK)
      .json({
        message: "User login successfully",
        user,
        token,
      });
  }
);

export const logoutController = asyncHandler(
  async (req: Request, res: Response) => {
    return clearJwtAuthCookie(res).status(HTTPSTATUS.OK).json({
      message: "User logout successfully",
    });
  }
);

export const authStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user;
    return res.status(HTTPSTATUS.OK).json({
      message: "Authenticated User",
      user,
    });
  }
);

// Dev-only: issue a JWT for header-based auth (no cookies)
export const devTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    if (Env.NODE_ENV === "production") {
      return res.status(HTTPSTATUS.FORBIDDEN).json({
        message: "Not available in production",
      });
    }

    const body = loginSchema.parse(req.body);
    const user = await loginService(body);

    const token = jwt.sign(
      { userId: user.id },
      Env.JWT_SECRET,
      {
        audience: ["user"],
        expiresIn: (Env.JWT_EXPIRES_IN as any) || "7d",
        algorithm: "HS256",
      }
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Dev token issued",
      token,
      user,
    });
  }
);
