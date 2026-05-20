import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

type JwtPayload = { sub: string; role: string; [key: string]: unknown };
type RequestWithUser = Request & { user?: JwtPayload };

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return field ? user[field] : user;
  },
);
