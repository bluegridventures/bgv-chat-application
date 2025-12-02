import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { UnauthorizedException } from "../utils/app-error";
import { Env } from "./env.config";
import { findByIdUserService } from "../services/user.service";

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => {
          if (!req) return null as any;
          if (Env.NODE_ENV !== "production") {
            const devHeader = (req.headers["x-dev-access-token"] || req.headers["authorization"]) as string | undefined;
            if (typeof devHeader === "string" && devHeader.length > 0) {
              let headerToken = devHeader;
              const lower = headerToken.toLowerCase();
              if (lower.startsWith("bearer ")) {
                headerToken = headerToken.slice(7);
              }
              if (headerToken) return headerToken as any;
            }
          }
          const token = req.cookies?.accessToken;
          if (!token) throw new UnauthorizedException("Unauthorized access");
          return token as any;
        },
      ]),
      secretOrKey: Env.JWT_SECRET,
      audience: ["user"],
      algorithms: ["HS256"],
    },
    async ({ userId }, done) => {
      try {
        const user = userId && (await findByIdUserService(userId));
        if (!user) return done(null, false);
        
        // Map the user object to match our Supabase schema
        const userWithId = {
          ...user,
          id: user.id || userId // Use the provided userId as fallback
        };
        
        return done(null, userWithId);
      } catch (error) {
        console.error('Passport JWT error:', error);
        return done(null, false);
      }
    }
  )
);

export const passportAuthenticateJwt = passport.authenticate("jwt", {
  session: false,
});
