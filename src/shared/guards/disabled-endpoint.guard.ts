import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class DisabledEndpointGuard implements CanActivate {
    public canActivate(_context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        throw new ForbiddenException('This endpoint is currently disabled');
    }
}
