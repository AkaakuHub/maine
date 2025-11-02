import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../common/database/prisma.service";

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
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
