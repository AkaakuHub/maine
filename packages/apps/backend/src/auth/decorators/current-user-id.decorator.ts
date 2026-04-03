import {
	createParamDecorator,
	ExecutionContext,
	ForbiddenException,
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
			throw new ForbiddenException("認証が必要です");
		}

		return userId;
	},
);
