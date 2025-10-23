import { Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { RollenMappingModule } from './rollenmapping.module.js';
import { RollenMappingController } from './api/rollenmapping.controller.js';
import { ServiceProviderModule } from '../service-provider/service-provider.module.js';

@Module({
    imports: [RollenMappingModule, LoggerModule.register(RollenMappingApiModule.name), ServiceProviderModule],
    providers: [],
    controllers: [RollenMappingController],
})
export class RollenMappingApiModule {}
