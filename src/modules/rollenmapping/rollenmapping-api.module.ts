import { Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { PersonModule } from '../person/person.module.js';
import { PersonenKontextModule } from '../personenkontext/personenkontext.module.js';
import { ServiceProviderModule } from '../service-provider/service-provider.module.js';
import { RollenMappingController } from './api/rollenmapping.controller.js';
import { RollenMappingService } from './api/rollenmapping.service.js';
import { RollenMappingModule } from './rollenmapping.module.js';

@Module({
    imports: [
        RollenMappingModule,
        LoggerModule.register(RollenMappingApiModule.name),
        ServiceProviderModule,
        PersonenKontextModule,
        PersonModule,
    ],
    providers: [RollenMappingService],
    controllers: [RollenMappingController],
})
export class RollenMappingApiModule {}
