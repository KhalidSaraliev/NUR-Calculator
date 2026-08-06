import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Достаёт { userId } из request.user (заполняется JwtStrategy) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
