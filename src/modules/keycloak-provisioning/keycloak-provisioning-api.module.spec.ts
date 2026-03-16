import { Test, TestingModule } from '@nestjs/testing';
import { ConfigTestModule, DatabaseTestModule, MapperTestModule } from '../../../test/utils/index.js';
import { KeycloakProvisioningApiModule } from './keycloak-provisioning-api.module.js';
import { KeycloakProvisioningController } from './keycloak-provisioning.controller.js';

describe('KeycloakProvisioningApiModule', () => {
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [ConfigTestModule, DatabaseTestModule.forRoot(), MapperTestModule, KeycloakProvisioningApiModule],
        }).compile();
    });

    afterAll(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(module).toBeDefined();
    });

    describe('when module is initialized', () => {
        it('should resolve KeycloakProvisioningController', () => {
            expect(module.get(KeycloakProvisioningController)).toBeInstanceOf(KeycloakProvisioningController);
        });
    });
});
