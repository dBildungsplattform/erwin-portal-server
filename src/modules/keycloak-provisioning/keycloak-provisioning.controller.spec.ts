import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigTestModule, DatabaseTestModule, DoFactory, MapperTestModule } from '../../../test/utils/index.js';
import { LoggingTestModule } from '../../../test/utils/logging-test.module.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { Person } from '../person/domain/person.js';
import { Rolle } from '../rolle/domain/rolle.js';
import { ErwinLdapMappedRollenArt } from '../rollenmapping/domain/lms-rollenarten.enums.js';
import { KeycloakProvisioningController } from './keycloak-provisioning.controller.js';
import { KeycloakProvisioningService } from './keycloak-provisioning.service.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';

describe('KeycloakProvisioningController', () => {
    let module: TestingModule;
    let keycloakProvisioningController: KeycloakProvisioningController;
    let serviceMock: DeepMocked<KeycloakProvisioningService>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigTestModule,
                LoggingTestModule,
                MapperTestModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
            ],
            providers: [
                KeycloakProvisioningController,
                {
                    provide: KeycloakProvisioningService,
                    useValue: createMock<KeycloakProvisioningService>(),
                },
            ],
        }).compile();

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));

        serviceMock = module.get(KeycloakProvisioningService);
        keycloakProvisioningController = module.get(KeycloakProvisioningController);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await module.get(MikroORM).close();
        await module.close();
    });

    it('should be defined', () => {
        expect(keycloakProvisioningController).toBeDefined();
    });

    describe('onNewLdapUser', () => {
        let params: LdapUserDataBodyParams;
        let schuleOrg: Organisation<true>;
        let parentOrg: Organisation<true>;
        let person: Person<true>;
        let rolle: Rolle<true>;
        let klasse: Organisation<true>;

        beforeEach(() => {
            params = new LdapUserDataBodyParams({
                schuleParams: {
                    schuleName: faker.company.name(),
                    zugehoerigZu: faker.string.uuid(),
                    ldapOu: faker.string.uuid(),
                } as SchuleLdapImportBodyParams,
                klasseParams: {
                    klasseName: faker.lorem.word(),
                    ldapDn: faker.string.uuid(),
                } as KlasseLdapImportBodyParams,
                personParams: {
                    keycloakUserId: faker.string.uuid(),
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    ldapDn: faker.string.uuid(),
                    email: faker.internet.email(),
                    geburtstag: faker.date.birthdate(),
                } as PersonLdapImportDataBody,
                rolle: ErwinLdapMappedRollenArt.LEHR,
            });

            schuleOrg = DoFactory.createOrganisation(true);
            parentOrg = DoFactory.createOrganisation(true);
            person = DoFactory.createPerson(true);
            rolle = DoFactory.createRolle(true);
            klasse = DoFactory.createOrganisation(true);

            serviceMock.createOrUpdateSchuleOrg.mockResolvedValue(schuleOrg);
            serviceMock.findOrCreateSchuleParentOrg.mockResolvedValue(parentOrg);
            serviceMock.createOrUpdatePerson.mockResolvedValue(person);
            serviceMock.findOrCreateRolle.mockResolvedValue(rolle);
            serviceMock.createOrUpdatePersonenkontextForSchule.mockResolvedValue(DoFactory.createPersonenkontext(true));
            serviceMock.createOrUpdateKlasse.mockResolvedValue(klasse);
            serviceMock.createPersonenkontextForKlasseIfNotExists.mockResolvedValue(
                DoFactory.createPersonenkontext(true),
            );
        });

        it('should call service methods in correct order', async () => {
            await keycloakProvisioningController.onNewLdapUser(params);

            expect(serviceMock.createOrUpdateSchuleOrg).toHaveBeenCalledWith(params.schuleParams);
            expect(serviceMock.findOrCreateSchuleParentOrg).toHaveBeenCalledWith(schuleOrg);
            expect(serviceMock.createOrUpdatePerson).toHaveBeenCalledWith(params.personParams);
            expect(serviceMock.findOrCreateRolle).toHaveBeenCalledWith(parentOrg, params.rolle);
            expect(serviceMock.createOrUpdatePersonenkontextForSchule).toHaveBeenCalledWith(schuleOrg, rolle, person);
            expect(serviceMock.createOrUpdateKlasse).toHaveBeenCalledWith(params.klasseParams, schuleOrg);
            expect(serviceMock.createPersonenkontextForKlasseIfNotExists).toHaveBeenCalledWith(klasse, rolle, person);
        });

        it('should throw if any service method fails', async () => {
            serviceMock.createOrUpdateSchuleOrg.mockRejectedValueOnce(new Error('fail'));
            await expect(keycloakProvisioningController.onNewLdapUser(params)).rejects.toThrow('fail');
        });
    });
});
