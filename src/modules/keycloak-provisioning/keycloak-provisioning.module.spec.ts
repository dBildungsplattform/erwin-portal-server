import { TestingModule, Test } from '@nestjs/testing';
import { KeycloakProvisioningModule } from './keycloak-provisioning.module.js';
import { KeycloakProvisioningService } from './keycloak-provisioning.service.js';
import { ConfigTestModule, DatabaseTestModule, MapperTestModule } from '../../../test/utils/index.js';

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
        it('should resolve KeycloakProvisioningService', () => {
            expect(module.get(KeycloakProvisioningService)).toBeInstanceOf(KeycloakProvisioningService);
        });
    });
});
