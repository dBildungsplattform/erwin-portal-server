import { faker } from '@faker-js/faker/';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';
import { HttpException } from '@nestjs/common';
import { ConfigTestModule } from '../../../../test/utils/config-test.module.js';
import { DatabaseTestModule, DoFactory, MapperTestModule } from '../../../../test/utils/index.js';
import { LoggingTestModule } from '../../../../test/utils/logging-test.module.js';
import { DomainError } from '../../../shared/error/domain.error.js';
import { PersonAlreadyExistsError } from '../../../shared/error/person-already-exists.error.js';
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

describe('KeycloakInternalController', () => {
    let module: TestingModule;
    let keycloakinternalController: KeycloakInternalController;
    let dbiamPersonenkontextRepoMock: DeepMocked<DBiamPersonenkontextRepo>;
    let personRepoMock: DeepMocked<PersonRepository>;
    let personFactoryMock: DeepMocked<PersonFactory>;

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
            providers: [KeycloakInternalController, UserExternaldataWorkflowFactory],
        })
            .overrideProvider(PersonRepository)
            .useValue(createMock<PersonRepository>())
            .overrideProvider(DBiamPersonenkontextRepo)
            .useValue(createMock<DBiamPersonenkontextRepo>())
            .overrideProvider(PersonFactory)
            .useValue(createMock<PersonFactory>())
            .compile();

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));

        keycloakinternalController = module.get(KeycloakInternalController);
        dbiamPersonenkontextRepoMock = module.get(DBiamPersonenkontextRepo);
        personRepoMock = module.get(PersonRepository);
        personFactoryMock = module.get(PersonFactory);
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
        it('should create new person', async () => {
            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(null);
            personFactoryMock.createNew.mockResolvedValueOnce(DoFactory.createPerson(false));

            await keycloakinternalController.onNewLdapUser({
                userName: faker.internet.userName(),
                email: faker.internet.email(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                keycloakUserId: faker.string.uuid(),
                ldapId: faker.string.uuid(),
                ldapDn: faker.internet.domainName(),
            });

            expect(personRepoMock.findByKeycloakUserId).toHaveBeenCalledTimes(1);
            expect(personFactoryMock.createNew).toHaveBeenCalledTimes(1);
            expect(personRepoMock.save).toHaveBeenCalledTimes(1);
        });

        it('should throw if creation of person fails', async () => {
            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(null);

            const err: DomainError = new PersonAlreadyExistsError('message');
            personFactoryMock.createNew.mockResolvedValueOnce(err);

            await expect(
                keycloakinternalController.onNewLdapUser({
                    userName: faker.internet.userName(),
                    email: faker.internet.email(),
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    keycloakUserId: faker.string.uuid(),
                    ldapId: faker.string.uuid(),
                    ldapDn: faker.internet.domainName(),
                }),
            ).rejects.toThrow(err);

            expect(personRepoMock.findByKeycloakUserId).toHaveBeenCalledTimes(1);
            expect(personFactoryMock.createNew).toHaveBeenCalledTimes(1);
            expect(personRepoMock.save).toHaveBeenCalledTimes(0);
        });

        it('should update existing person', async () => {
            personRepoMock.findByKeycloakUserId.mockResolvedValueOnce(DoFactory.createPerson(true));

            await keycloakinternalController.onNewLdapUser({
                userName: faker.internet.userName(),
                email: faker.internet.email(),
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                keycloakUserId: faker.string.uuid(),
                ldapId: faker.string.uuid(),
                ldapDn: faker.internet.domainName(),
            });

            expect(personRepoMock.findByKeycloakUserId).toHaveBeenCalledTimes(1);
            expect(personFactoryMock.createNew).toHaveBeenCalledTimes(0);
            expect(personRepoMock.save).toHaveBeenCalledTimes(1);
        });
    });
});
