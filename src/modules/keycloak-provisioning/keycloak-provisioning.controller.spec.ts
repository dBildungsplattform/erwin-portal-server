import { faker } from '@faker-js/faker';
import { createMock, DeepMocked } from '@golevelup/ts-jest';
import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigTestModule, DatabaseTestModule, DoFactory, MapperTestModule } from '../../../test/utils/index.js';
import { LoggingTestModule } from '../../../test/utils/logging-test.module.js';
import { ErwinLdapMappedRollenArt } from '../rollenmapping/domain/lms-rollenarten.enums.js';
import { KeycloakProvisioningController } from './keycloak-provisioning.controller.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';
import { LdapUserDataBodyParams } from './ldap/ldap-user-data.body.params.js';
import { PersonLdapImportDataBody } from './ldap/person-ldap-import.body.params.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';
import { OrganisationLdapImportService } from './organisation-ldap-import.service.js';
import { PersonLdapImportService } from './person-ldap-import.service.js';
import { RolleLdapImportService } from './rolle-ldap-import.service.js';
import { PersonenkontextLdapImportService } from './personenkontext-ldap-import.service.js';
import { OrganisationsTyp } from '../organisation/domain/organisation.enums.js';
import { RollenArt } from '../rolle/domain/rolle.enums.js';
import { Personenkontext } from '../personenkontext/domain/personenkontext.js';
import { Rolle } from '../rolle/domain/rolle.js';
import { Person } from '../person/domain/person.js';
import { Organisation } from '../organisation/domain/organisation.js';

describe('KeycloakProvisioningController', () => {
    let module: TestingModule;
    let keycloakProvisioningController: KeycloakProvisioningController;
    let organisationLdapImportServiceMock: DeepMocked<OrganisationLdapImportService>;
    let personLdapImportServiceMock: DeepMocked<PersonLdapImportService>;
    let rolleLdapImportServiceMock: DeepMocked<RolleLdapImportService>;
    let personenkontextLdapImportServiceMock: DeepMocked<PersonenkontextLdapImportService>;

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
                    provide: OrganisationLdapImportService,
                    useValue: createMock<OrganisationLdapImportService>(),
                },
                {
                    provide: PersonLdapImportService,
                    useValue: createMock<PersonLdapImportService>(),
                },
                {
                    provide: RolleLdapImportService,
                    useValue: createMock<RolleLdapImportService>(),
                },
                {
                    provide: PersonenkontextLdapImportService,
                    useValue: createMock<PersonenkontextLdapImportService>(),
                },
            ],
        }).compile();

        await DatabaseTestModule.setupDatabase(module.get(MikroORM));

        organisationLdapImportServiceMock = module.get(OrganisationLdapImportService);
        personLdapImportServiceMock = module.get(PersonLdapImportService);
        rolleLdapImportServiceMock = module.get(RolleLdapImportService);
        personenkontextLdapImportServiceMock = module.get(PersonenkontextLdapImportService);
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
                klassen: [
                    {
                        name: faker.lorem.word(),
                        externalId: faker.string.uuid(),
                    } as KlasseLdapImportBodyParams,
                ],
                person: {
                    keycloakUserId: faker.string.uuid(),
                    vorname: faker.person.firstName(),
                    nachname: faker.person.lastName(),
                    externalId: faker.string.uuid(),
                    email: faker.internet.email(),
                    geburtstag: faker.date.birthdate(),
                } as PersonLdapImportDataBody,
                rolle: ErwinLdapMappedRollenArt.LEHR,
            });

            const schuleOrg: Organisation<true> = DoFactory.createOrganisation(true, { typ: OrganisationsTyp.SCHULE });
            const parentOrg: Organisation<true> = DoFactory.createOrganisation(true, { typ: OrganisationsTyp.LAND });
            const klasseOrg: Organisation<true> = DoFactory.createOrganisation(true, { typ: OrganisationsTyp.KLASSE });
            const person: Person<true> = DoFactory.createPerson(true);
            const rolle: Rolle<true> = DoFactory.createRolle(true, { rollenart: RollenArt.LEHR });
            const personenkontext: Personenkontext<true> = DoFactory.createPersonenkontext(true);

            organisationLdapImportServiceMock.createOrUpdateSchuleOrg.mockResolvedValue(schuleOrg);
            organisationLdapImportServiceMock.findOrCreateSchuleParentOrg.mockResolvedValue(parentOrg);
            organisationLdapImportServiceMock.createOrUpdateKlasse.mockResolvedValue(klasseOrg);
            personLdapImportServiceMock.createOrUpdatePerson.mockResolvedValue(person);
            rolleLdapImportServiceMock.findOrCreateRolle.mockResolvedValue(rolle);
            personenkontextLdapImportServiceMock.createOrUpdatePersonenkontextForSchule.mockResolvedValue(
                personenkontext,
            );
            personenkontextLdapImportServiceMock.createPersonenkontextForKlasseIfNotExists.mockResolvedValue(
                personenkontext,
            );
        });

        it('should call all services with correct params', async () => {
            await keycloakProvisioningController.onNewLdapUser(params);

            expect(organisationLdapImportServiceMock.createOrUpdateSchuleOrg).toHaveBeenCalledWith(params.schule);
            expect(personLdapImportServiceMock.createOrUpdatePerson).toHaveBeenCalledWith(params.person);
            expect(rolleLdapImportServiceMock.findOrCreateRolle).toHaveBeenCalled();
        });

        it('should throw if createOrUpdateSchuleOrg fails', async () => {
            organisationLdapImportServiceMock.createOrUpdateSchuleOrg.mockRejectedValueOnce(new Error('fail'));
            await expect(keycloakProvisioningController.onNewLdapUser(params)).rejects.toThrow('fail');
        });
    });
});
