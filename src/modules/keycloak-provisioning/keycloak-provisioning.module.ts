import { forwardRef, Module } from '@nestjs/common';
import { LoggerModule } from '../../core/logging/logger.module.js';
import { EventModule } from '../../core/eventbus/index.js';
import { PersonModule } from '../person/person.module.js';
import { OrganisationModule } from '../organisation/organisation.module.js';
import { RolleModule } from '../rolle/rolle.module.js';
import { PersonenKontextModule } from '../personenkontext/personenkontext.module.js';
import { OrganisationLdapImportService } from './organisation-ldap-import.service.js';
import { PersonLdapImportService } from './person-ldap-import.service.js';
import { RolleLdapImportService } from './rolle-ldap-import.service.js';
import { PersonenkontextLdapImportService } from './personenkontext-ldap-import.service.js';

@Module({
    imports: [
        LoggerModule.register(KeycloakProvisioningModule.name),
        EventModule,
        forwardRef(() => PersonModule),
        OrganisationModule,
        RolleModule,
        forwardRef(() => PersonenKontextModule),
    ],
    providers: [
        OrganisationLdapImportService,
        PersonLdapImportService,
        RolleLdapImportService,
        PersonenkontextLdapImportService,
    ],
    exports: [
        OrganisationLdapImportService,
        PersonLdapImportService,
        RolleLdapImportService,
        PersonenkontextLdapImportService,
    ],
})
export class KeycloakProvisioningModule {}
