import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ConfigTestModule, DatabaseTestModule, MapperTestModule } from '../../../test/utils/index.js';
import { LoggingTestModule } from '../../../test/utils/logging-test.module.js';
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

        beforeEach(() => {
            params = new LdapUserDataBodyParams({
                schule: {
                    name: faker.company.name(),
                    zugehoerigZu: faker.string.uuid(),
                    externalId: faker.string.uuid(),
                } as SchuleLdapImportBodyParams,
                klasse: {
                    name: faker.lorem.word(),
                    externalId: faker.string.uuid(),
                } as KlasseLdapImportBodyParams,
                person: {
                    keycloakUserId: faker.string.uuid(),
                    vorname: faker.person.firstName(),
                    nachname: faker.person.lastName(),
                    externalId: faker.string.uuid(),
                    email: faker.internet.email(),
                    geburtstag: faker.date.birthdate(),
                } as PersonLdapImportDataBody,
                role: ErwinLdapMappedRollenArt.LEHR,
            });

            serviceMock.importLdapUser.mockResolvedValue(undefined);
        });

        it('should call importLdapUser with correct params', async () => {
            await keycloakProvisioningController.onNewLdapUser(params);

            expect(serviceMock.importLdapUser).toHaveBeenCalledWith(params);
        });

        it('should throw if importLdapUser fails', async () => {
            serviceMock.importLdapUser.mockRejectedValueOnce(new Error('fail'));
            await expect(keycloakProvisioningController.onNewLdapUser(params)).rejects.toThrow('fail');
        });
    });

    describe('LdapUserDataBodyParams DTO', () => {
        it('should create an instance via constructor', () => {
            const params: LdapUserDataBodyParams = new LdapUserDataBodyParams({
                schule: {
                    name: faker.company.name(),
                    zugehoerigZu: faker.string.uuid(),
                    externalId: faker.string.uuid(),
                } as SchuleLdapImportBodyParams,
                klasse: {
                    name: faker.lorem.word(),
                    externalId: faker.string.uuid(),
                } as KlasseLdapImportBodyParams,
                person: {
                    keycloakUserId: faker.string.uuid(),
                    vorname: faker.person.firstName(),
                    nachname: faker.person.lastName(),
                    externalId: faker.string.uuid(),
                    email: faker.internet.email(),
                    geburtstag: faker.date.birthdate(),
                } as PersonLdapImportDataBody,
                role: ErwinLdapMappedRollenArt.LERN,
            });

            expect(params).toBeInstanceOf(LdapUserDataBodyParams);
            expect(params.schule).toBeDefined();
            expect(params.klasse).toBeDefined();
            expect(params.person).toBeDefined();
            expect(params.role).toBe(ErwinLdapMappedRollenArt.LERN);
        });

        it('should transform plain object to class instance with nested types', () => {
            const plainObject: object = {
                schuleParams: {
                    name: faker.company.name(),
                    zugehoerigZu: faker.string.uuid(),
                    externalId: faker.string.uuid(),
                },
                klasseParams: {
                    name: faker.lorem.word(),
                    externalId: faker.string.uuid(),
                },
                personParams: {
                    keycloakUserId: faker.string.uuid(),
                    vorname: faker.person.firstName(),
                    nachname: faker.person.lastName(),
                    externalId: faker.string.uuid(),
                    email: faker.internet.email(),
                    geburtstag: faker.date.birthdate(),
                },
                role: ErwinLdapMappedRollenArt.LEHR,
            };

            const instance: LdapUserDataBodyParams = plainToInstance(LdapUserDataBodyParams, plainObject);

            expect(instance).toBeInstanceOf(LdapUserDataBodyParams);
            expect(instance.schule).toBeInstanceOf(SchuleLdapImportBodyParams);
            expect(instance.klasse).toBeInstanceOf(KlasseLdapImportBodyParams);
            expect(instance.person).toBeInstanceOf(PersonLdapImportDataBody);
        });

        it('should validate a valid LdapUserDataBodyParams instance', async () => {
            const plainObject: object = {
                schuleParams: {
                    name: faker.company.name(),
                    zugehoerigZu: faker.string.uuid(),
                    externalId: faker.string.uuid(),
                },
                klasseParams: {
                    name: faker.lorem.word(),
                    externalId: faker.string.uuid(),
                },
                personParams: {
                    keycloakUserId: faker.string.uuid(),
                    vorname: faker.person.firstName(),
                    nachname: faker.person.lastName(),
                    externalId: faker.string.uuid(),
                    email: faker.internet.email(),
                    geburtstag: faker.date.birthdate(),
                },
                role: ErwinLdapMappedRollenArt.LEIT,
            };

            const instance: LdapUserDataBodyParams = plainToInstance(LdapUserDataBodyParams, plainObject);
            const errors: object[] = await validate(instance);

            expect(errors.length).toBe(0);
        });
    });
});
