import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../common/database/prisma.service";

const ACCESS_TOKEN_COOKIE_NAME = "access_token";

type RequestWithCookieAuthFlag = {
	method?: string;
	allowCookieAuth?: boolean;
	headers?: {
		cookie?: string;
	};
};

function getTokenFromCookieHeader(cookieHeader?: string): string | null {
	if (!cookieHeader) return null;

	const cookies = cookieHeader.split(";");
	for (const cookie of cookies) {
		const [rawName, ...rawValueParts] = cookie.trim().split("=");
		if (rawName !== ACCESS_TOKEN_COOKIE_NAME) {
			continue;
		}
		const rawValue = rawValueParts.join("=");
		return decodeURIComponent(rawValue);
	}

	return null;
}

function isSafeMethod(method?: string): boolean {
	if (!method) return false;
	const upper = method.toUpperCase();
	return upper === "GET" || upper === "HEAD";
}

function canUseCookieAuth(request?: RequestWithCookieAuthFlag): boolean {
	if (!request || !isSafeMethod(request.method)) {
		return false;
	}
	return request.allowCookieAuth === true;
}

interface JwtPayload {
	sub: string;
	iat: number;
	exp: number;
	username?: string;
	role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
	constructor(
		private readonly prisma: PrismaService,
		private readonly configService: ConfigService,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromExtractors([
				ExtractJwt.fromAuthHeaderAsBearerToken(),
				(request) => {
					if (!canUseCookieAuth(request)) {
						return null;
					}
					const cookieHeader = (
						request as RequestWithCookieAuthFlag | undefined
					)?.headers?.cookie;
					return getTokenFromCookieHeader(cookieHeader);
				},
			]),
			ignoreExpiration: false,
			secretOrKey: configService.get<string>("JWT_SECRET") as string,
		});
	}

	async validate(payload: JwtPayload) {
		// AuthServiceの代わりに直接PrismaServiceを使用してユーザーを検証
		const user = await this.prisma.user.findUnique({
			where: { id: payload.sub },
			select: {
				id: true,
				username: true,
				email: true,
				role: true,
				isActive: true,
			},
		});

		if (!user || !user.isActive) {
			throw new UnauthorizedException(
				"ユーザーが見つからないか、無効になっています",
			);
		}

		return {
			userId: payload.sub,
			...user,
		};
	}
}
