import { DiscoveryModule } from '@golevelup/nestjs-discovery';
import { Global, Module, OnApplicationBootstrap } from '@nestjs/common';

import { ClassLogger } from '../logging/class-logger.js';
import { LoggerModule } from '../logging/logger.module.js';
import { EventDiscoveryService } from './services/event-discovery.service.js';
import { EventService } from './services/event.service.js';
import { KafkaEventService } from './services/kafka-event.service.js';
import { KafkaProvider } from './kafka-client-provider.js';

@Global()
@Module({
    imports: [LoggerModule.register(EventModule.name), DiscoveryModule],
    providers: [EventService, KafkaEventService, EventDiscoveryService, KafkaProvider],
    exports: [EventService, KafkaEventService],
})
export class EventModule implements OnApplicationBootstrap {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly discoveryService: EventDiscoveryService,
    ) {}

    public async onApplicationBootstrap(): Promise<void> {
        const handlerCount: number = await this.discoveryService.registerEventHandlers();
        this.logger.notice(`Registered ${handlerCount} event listeners`);
    }
}
