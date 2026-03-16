import { TestingModule, Test } from '@nestjs/testing';
import { KeycloakProvisioningModule } from './keycloak-provisioning.module.js';
import { ConfigTestModule, DatabaseTestModule, MapperTestModule } from '../../../test/utils/index.js';
import { OrganisationLdapImportService } from './organisation-ldap-import.service.js';
import { PersonLdapImportService } from './person-ldap-import.service.js';
import { RolleLdapImportService } from './rolle-ldap-import.service.js';
import { PersonenkontextLdapImportService } from './personenkontext-ldap-import.service.js';

describe('KeycloakProvisioningModule', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [ConfigTestModule, DatabaseTestModule.forRoot(), MapperTestModule, KeycloakProvisioningModule],
        }).compile();
    });

    afterAll(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    describe('when module is initialized', () => {
        it('should resolve OrganisationLdapImportService', () => {
            expect(module.get(OrganisationLdapImportService)).toBeInstanceOf(OrganisationLdapImportService);
        });

        it('should resolve PersonLdapImportService', () => {
            expect(module.get(PersonLdapImportService)).toBeInstanceOf(PersonLdapImportService);
        });

        it('should resolve RolleLdapImportService', () => {
            expect(module.get(RolleLdapImportService)).toBeInstanceOf(RolleLdapImportService);
        });

        it('should resolve PersonenkontextLdapImportService', () => {
            expect(module.get(PersonenkontextLdapImportService)).toBeInstanceOf(PersonenkontextLdapImportService);
        });
    });
});
