import { Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { RollenMappingModule } from './rollenmapping.module.js';
import { RollenMappingController } from './api/rollenmapping.controller.js';
import { ServiceProviderModule } from '../service-provider/service-provider.module.js';
import { PersonenKontextModule } from '../personenkontext/personenkontext.module.js';
import { RollenMappingService } from './api/rollenmapping.service.js';

@Module({
    imports: [
        RollenMappingModule,
        LoggerModule.register(RollenMappingApiModule.name),
        ServiceProviderModule,
        PersonenKontextModule,
    ],
    providers: [RollenMappingService],
    controllers: [RollenMappingController],
})
export class RollenMappingApiModule {}
