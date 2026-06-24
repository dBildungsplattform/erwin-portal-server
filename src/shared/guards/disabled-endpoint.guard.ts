import { Injectable, CanActivate, ForbiddenException } from '@nestjs/common';

@Injectable()
export class DisabledEndpointGuard implements CanActivate {
    public canActivate(): boolean {
        throw new ForbiddenException('This endpoint is currently disabled');
    }
}
