import { Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { EventModule } from '../../core/eventbus/index.js';
import { PersonModule } from '../person/person.module.js';
import { RolleModule } from '../rolle/rolle.module.js';
import { PersonenKontextModule } from '../personenkontext/personenkontext.module.js';
import { KeycloakProvisioningModule } from './keycloak-provisioning.module.js';
import { KeycloakProvisioningController } from './keycloak-provisioning.controller.js';
import { OrganisationModule } from '../organisation/organisation.module.js';

@Module({
    imports: [
        LoggerModule.register(KeycloakProvisioningApiModule.name),
        KeycloakProvisioningModule,
        EventModule,
        PersonModule,
        RolleModule,
        PersonenKontextModule,
        OrganisationModule,
    ],
    providers: [],
    controllers: [KeycloakProvisioningController],
})
export class KeycloakProvisioningApiModule {}
