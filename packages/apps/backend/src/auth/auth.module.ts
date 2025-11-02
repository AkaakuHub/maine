import { Module } from "@nestjs/common";
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
		DatabaseModule,
		PassportModule,
		JwtModule.register({
			secret: process.env.JWT_SECRET || "maine-secret-key",
			signOptions: { expiresIn: "24h" },
		}),
	],
	controllers: [AuthController, PermissionsController],
	providers: [AuthService, JwtStrategy, PermissionsService],
	exports: [AuthService, PermissionsService],
})
export class AuthModule {}
