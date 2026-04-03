import { SetMetadata } from "@nestjs/common";

export const ALLOW_COOKIE_AUTH_KEY = "allowCookieAuth";

export const AllowCookieAuth = () => SetMetadata(ALLOW_COOKIE_AUTH_KEY, true);
