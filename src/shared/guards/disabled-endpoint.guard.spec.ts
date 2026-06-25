import { ForbiddenException } from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { ExecutionContext } from '@nestjs/common';
import { DisabledEndpointGuard } from './disabled-endpoint.guard.js';

describe('DisabledEndpointGuard', () => {
    let guard: DisabledEndpointGuard;

    beforeEach(() => {
        guard = new DisabledEndpointGuard();
    });

    it('should throw ForbiddenException for any request', () => {
        const context: ExecutionContext = createMock<ExecutionContext>();

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        expect(() => guard.canActivate(context)).toThrow('This endpoint is currently disabled');
    });
});
