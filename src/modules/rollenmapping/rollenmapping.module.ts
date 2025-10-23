import { forwardRef, Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { RollenMappingFactory } from './domain/rollenmapping.factory.js';
import { RollenMappingRepo } from './repo/rollenmapping.repo.js';
import { ServiceProviderRepo } from '../service-provider/repo/service-provider.repo.js';
import { ServiceProviderModule } from '../service-provider/service-provider.module.js';

@Module({
    imports: [LoggerModule.register(RollenMappingModule.name), forwardRef(() => ServiceProviderModule)],
    providers: [RollenMappingRepo, RollenMappingFactory, ServiceProviderRepo],
    exports: [RollenMappingRepo, RollenMappingFactory],
})
export class RollenMappingModule {}
