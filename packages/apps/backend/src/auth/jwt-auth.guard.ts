import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./decorators/public.decorator";
import { ALLOW_COOKIE_AUTH_KEY } from "./decorators/allow-cookie-auth.decorator";

type RequestWithCookieAuthFlag = {
	allowCookieAuth?: boolean;
};

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
	constructor(private readonly reflector: Reflector) {
		super();
	}

	canActivate(context: ExecutionContext) {
		const request = context
			.switchToHttp()
			.getRequest<RequestWithCookieAuthFlag>();

		const allowCookieAuth = this.reflector.getAllAndOverride<boolean>(
			ALLOW_COOKIE_AUTH_KEY,
			[context.getHandler(), context.getClass()],
		);
		request.allowCookieAuth = !!allowCookieAuth;

		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return true;
		}

		return super.canActivate(context);
	}
}
