import { Module } from '@nestjs/common';

import { ImportController } from './api/import.controller.js';
import { ImportModule } from './import.module.js';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ImportConfig } from '../../shared/config/import.config.js';
import { LoggerModule } from '../../core/logging/logger.module.js';

@Module({
    imports: [
        ImportModule,
        LoggerModule.register(ImportApiModule.name),
        MulterModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                limits: {
                    fileSize:
                        configService.getOrThrow<ImportConfig>('IMPORT').CSV_FILE_MAX_SIZE_IN_MB * Math.pow(1024, 2),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [],
    controllers: [ImportController],
})
export class ImportApiModule {}
