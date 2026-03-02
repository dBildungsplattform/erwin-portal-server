import { forwardRef, Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { EventModule } from '../../core/eventbus/index.js';
import { KeycloakProvisioningService } from './keycloak-provisioning.service.js';
import { PersonModule } from '../person/person.module.js';
import { OrganisationModule } from '../organisation/organisation.module.js';
import { RolleModule } from '../rolle/rolle.module.js';
import { PersonenKontextModule } from '../personenkontext/personenkontext.module.js';

@Module({
    imports: [
        LoggerModule.register(KeycloakProvisioningModule.name),
        EventModule,
        forwardRef(() => PersonModule),
        OrganisationModule,
        RolleModule,
        forwardRef(() => PersonenKontextModule),
    ],
    providers: [KeycloakProvisioningService],
    exports: [KeycloakProvisioningService],
})
export class KeycloakProvisioningModule {}
