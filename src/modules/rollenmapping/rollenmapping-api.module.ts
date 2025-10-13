import { Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { RollenMappingModule } from './rollenmapping.module.js';
import { RollenmappingController } from './api/rollenmapping.controller.js';

@Module({
    imports: [RollenMappingModule, LoggerModule.register(RollenMappingApiModule.name)],
    providers: [],
    controllers: [RollenmappingController],
})
export class RollenMappingApiModule {}
