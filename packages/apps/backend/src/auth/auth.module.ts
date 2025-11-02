import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { PermissionsService } from "./permissions.service";
import { PermissionsController } from "./permissions.controller";
import { DatabaseModule } from "../common/database/database.module";

@Module({
	imports: [
		ConfigModule,
		DatabaseModule,
		PassportModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				secret: configService.get<string>("JWT_SECRET"),
				signOptions: { expiresIn: "180d" },
			}),
		}),
	],
	controllers: [AuthController, PermissionsController],
	providers: [AuthService, JwtStrategy, PermissionsService],
	exports: [AuthService, PermissionsService],
})
export class AuthModule {}
