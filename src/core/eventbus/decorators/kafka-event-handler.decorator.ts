import { SetMetadata } from '@nestjs/common';

import { BaseEvent } from '../../../shared/events/index.js';
import { KAFKA_EVENT_HANDLER_META } from '../types/metadata-key.js';
import { Constructor, EventHandlerType, TypedMethodDecorator } from '../types/util.types.js';

export function KafkaEventHandler<Event extends BaseEvent, ClassType, MethodName extends keyof ClassType>(
    eventClass: Constructor<Event>,
): TypedMethodDecorator<ClassType, MethodName, EventHandlerType<Event>> {
    return SetMetadata(KAFKA_EVENT_HANDLER_META, eventClass);
}
