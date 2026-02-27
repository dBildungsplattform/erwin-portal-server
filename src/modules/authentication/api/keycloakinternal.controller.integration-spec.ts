import { faker } from '@faker-js/faker/';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';
import { HttpException } from '@nestjs/common';
import { ConfigTestModule } from '../../../../test/utils/config-test.module.js';
import { DatabaseTestModule, DoFactory, MapperTestModule } from '../../../../test/utils/index.js';
import { LoggingTestModule } from '../../../../test/utils/logging-test.module.js';
import { PersonFactory } from '../../person/domain/person.factory.js';
import { Person } from '../../person/domain/person.js';
import { PersonRepository } from '../../person/persistence/person.repository.js';
import { PersonModule } from '../../person/person.module.js';
import {
    DBiamPersonenkontextRepo,
    ExternalPkData,
} from '../../personenkontext/persistence/dbiam-personenkontext.repo.js';
import { PersonenKontextModule } from '../../personenkontext/personenkontext.module.js';
import { RollenArt } from '../../rolle/domain/rolle.enums.js';
import { ServiceProviderModule } from '../../service-provider/service-provider.module.js';
import { UserExternaldataWorkflowFactory } from '../domain/user-extenaldata.factory.js';
import { UserExeternalDataResponse } from './externaldata/user-externaldata.response.js';
import { KeycloakInternalController } from './keycloakinternal.controller.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { KeycloakInternalService } from './keycloakinternal.service.js';
import { Organisation } from '../../organisation/domain/organisation.js';
import { Rolle } from '../../rolle/domain/rolle.js';
import { ErwinLdapMappedRollenArt } from '../../rollenmapping/domain/lms-rollenarten.enums.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

describe('KeycloakInternalController', () => {
    let module: TestingModule;
    let keycloakinternalController: KeycloakInternalController;
    let dbiamPersonenkontextRepoMock: DeepMocked<DBiamPersonenkontextRepo>;
    let personRepoMock: DeepMocked<PersonRepository>;
    let serviceMock: DeepMocked<KeycloakInternalService>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigTestModule,
                LoggingTestModule,
                MapperTestModule,
                ServiceProviderModule,
                DatabaseTestModule.forRoot({ isDatabaseRequired: true }),
                PersonModule,
                PersonenKontextModule,
            ],
            providers: [
                KeycloakInternalController,
                UserExternaldataWorkflowFactory,
                {
                    provide: KeycloakInternalService,
                    useValue: createMock<KeycloakInternalService>(),
                },
            ],
        })
            .overrideProvider(PersonRepository)
            .useValue(createMock<PersonRepository>())
            .overrideProvider(DBiamPersonenkontextRepo)
            .useValue(createMock<DBiamPersonenkontextRepo>())
            .overrideProvider(PersonFactory)
            .useValue(createMock<PersonFactory>())
            .compile();

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));

        serviceMock = module.get(KeycloakInternalService);
        keycloakinternalController = module.get(KeycloakInternalController);
        dbiamPersonenkontextRepoMock = module.get(DBiamPersonenkontextRepo);
        personRepoMock = module.get(PersonRepository);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await module.get(MikroORM).close();
        await module.close();
    });

    it('should be defined', () => {
        expect(keycloakinternalController).toBeDefined();
    });

    describe('externalData', () => {
        it('should return user external data', async () => {
            const keycloakSub: string = faker.string.uuid();
            const person: Person<true> = Person.construct(
                faker.string.uuid(),
                faker.date.past(),
                faker.date.recent(),
                faker.person.lastName(),
                faker.person.firstName(),
                '1',
                faker.lorem.word(),
                keycloakSub,
                faker.string.uuid(),
            );
            person.geburtsdatum = faker.date.past();

            const pkExternalData: ExternalPkData[] = [
                {
                    rollenart: RollenArt.LEHR,
                    kennung: faker.lorem.word(),
                },
                {
                    rollenart: RollenArt.LERN,
                    kennung: faker.lorem.word(),
                },
                {
                    rollenart: RollenArt.EXTERN,
                    kennung: undefined, //To Be Filtered Out
                },
            ];

            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(person);
            personRepoMock.findById.mockResolvedValueOnce(person);
            dbiamPersonenkontextRepoMock.findExternalPkData.mockResolvedValueOnce(pkExternalData);

            const result: UserExeternalDataResponse = await keycloakinternalController.getExternalData({
                sub: keycloakSub,
            });
            expect(result).toBeInstanceOf(UserExeternalDataResponse);
            expect(result.ox.id).toContain(`${person.referrer}@`);
            expect(result.itslearning.personId).toEqual(person.id);
            expect(result.vidis.dienststellenNummern.length).toEqual(2);
            expect(result.opsh.vorname).toEqual(person.vorname);
            expect(result.opsh.nachname).toEqual(person.familienname);
            expect(result.opsh.emailAdresse).toEqual(person.email);
            expect(result.opsh.personenkontexte.length).toEqual(2);
            expect(result.onlineDateiablage.personId).toEqual(person.id);
        });

        it('should throw error if aggregate doesnt initialize fields field correctly', async () => {
            const keycloakSub: string = faker.string.uuid();
            const pkExternalData: ExternalPkData[] = [
                {
                    rollenart: RollenArt.LEHR,
                    kennung: faker.lorem.word(),
                },
                {
                    rollenart: RollenArt.LERN,
                    kennung: faker.lorem.word(),
                },
            ];

            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(createMock<Person<true>>());
            personRepoMock.findById.mockResolvedValueOnce(undefined);
            dbiamPersonenkontextRepoMock.findExternalPkData.mockResolvedValueOnce(pkExternalData);

            await expect(keycloakinternalController.getExternalData({ sub: keycloakSub })).rejects.toThrow(
                HttpException,
            );
        });

        it('should throw error if aggregate doesnt initialize fields field correctly', async () => {
            const keycloakSub: string = faker.string.uuid();
            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(undefined);

            await expect(keycloakinternalController.getExternalData({ sub: keycloakSub })).rejects.toThrow(
                HttpException,
            );
        });
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
            await keycloakinternalController.onNewLdapUser(params);

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
            await expect(keycloakinternalController.onNewLdapUser(params)).rejects.toThrow('fail');
        });
    });

    describe('LdapUserDataBodyParams decorators', () => {
        it('transforms + validates nested DTOs', async () => {
            const payload: LdapUserDataBodyParams = {
                klasseParams: { klasseName: 'x', ldapDn: 'dn' },
                schuleParams: { schuleName: 'y', zugehoerigZu: 'z', ldapOu: 'ou' },
                personParams: {
                    keycloakUserId: 'id',
                    firstName: 'a',
                    lastName: 'b',
                    ldapDn: 'dn',
                    email: 'a@b.com',
                    geburtstag: new Date(),
                },
                rolle: ErwinLdapMappedRollenArt.LEHR,
            };

            const dto: LdapUserDataBodyParams = plainToInstance(LdapUserDataBodyParams, payload);
            const errors: ValidationError[] = await validate(dto);

            expect(errors).toHaveLength(0);
        });

        it('fails when rolle is not a string', async () => {
            const payload = {
                klasseParams: {},
                schuleParams: {},
                personParams: {},
                rolle: 123,
            };

            const dto: LdapUserDataBodyParams = plainToInstance(LdapUserDataBodyParams, payload);
            const errors: ValidationError[] = await validate(dto);

            expect(errors.length).toBeGreaterThan(0);
            expect(errors.some((e: ValidationError) => e.property === 'rolle')).toBe(true);
        });
    });
});
