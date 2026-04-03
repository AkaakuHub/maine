import {
	createParamDecorator,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";

type RequestWithOptionalUser = {
	user?: {
		userId?: string;
	};
};

export const CurrentUserId = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): string => {
		const request = ctx.switchToHttp().getRequest<RequestWithOptionalUser>();
		const userId = request.user?.userId;

		if (!userId) {
			throw new UnauthorizedException("認証が必要です");
		}

		return userId;
	},
);
