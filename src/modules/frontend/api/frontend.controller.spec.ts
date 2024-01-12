import { faker } from '@faker-js/faker/';
import { DeepMocked, createMock } from '@golevelup/ts-jest';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response } from 'express';
import { Session, SessionData } from 'express-session';
import {
    Client,
    EndSessionParameters,
    IssuerMetadata,
    UserinfoResponse as OpenIdUserinfoResponse,
} from 'openid-client';

import { ConfigTestModule } from '../../../../test/utils/config-test.module.js';
import { FrontendConfig } from '../../../shared/config/frontend.config.js';
import { OIDC_CLIENT } from '../auth/oidc-client.service.js';
import { User } from '../auth/user.decorator.js';
import { ProviderService } from '../outbound/provider.service.js';
import { FrontendController } from './frontend.controller.js';
import { GetServiceProviderInfoDo } from '../../rolle/domain/get-service-provider-info.do.js';
import { PersonService } from '../outbound/person.service.js';
import { PersonendatensatzResponse } from '../../person/api/personendatensatz.response.js';
import { PagedResponse } from '../../../shared/paging/index.js';
import { Geschlecht, Vertrauensstufe } from '../../person/domain/person.enums.js';
import { PersonResponse } from '../../person/api/person.response.js';
import { PersonenkontextResponse } from '../../person/api/personenkontext.response.js';
import { PersonBirthParams } from '../../person/api/person-birth.params.js';
import { PersonByIdParams } from '../../person/api/person-by-id.param.js';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreatePersonBodyParams } from '../../person/api/create-person.body.params.js';
import { PersonNameParams } from '../../person/api/person-name.params.js';
import { UserinfoResponse } from './userinfo.response.js';
import { OrganisationService } from '../outbound/organisation.service.js';
import { CreateOrganisationBodyParams } from '../../organisation/api/create-organisation.body.params.js';
import { OrganisationsTyp } from '../../organisation/domain/organisation.enums.js';
import { OrganisationResponse } from '../../organisation/api/organisation.response.js';
import { firstValueFrom, of } from 'rxjs';
import { FindOrganisationQueryParams } from '../../organisation/api/find-organisation-query.param.js';

function getPersonenDatensatzResponse(): PersonendatensatzResponse {
    const mockBirthParams: PersonBirthParams = {
        datum: faker.date.anytime(),
        geburtsort: faker.string.alpha(),
    };
    const options: {
        referrer: string;
        lastName: string;
        firstName: string;
    } = {
        referrer: faker.string.alpha(),
        lastName: faker.person.lastName(),
        firstName: faker.person.firstName(),
    };
    const personResponse: PersonResponse = {
        id: faker.string.uuid(),
        name: {
            familienname: options.lastName,
            vorname: options.firstName,
        },
        referrer: options.referrer,
        mandant: '',
        geburt: mockBirthParams,
        geschlecht: Geschlecht.M,
        lokalisierung: '',
        vertrauensstufe: Vertrauensstufe.VOLL,
        revision: '1',
    };
    const personenKontextResponse: PersonenkontextResponse[] = [];
    const response: PersonendatensatzResponse = {
        person: personResponse,
        personenkontexte: personenKontextResponse,
    };
    return response;
}
describe('FrontendController', () => {
    let module: TestingModule;
    let frontendController: FrontendController;
    let oidcClient: DeepMocked<Client>;
    let frontendConfig: FrontendConfig;
    let providerService: DeepMocked<ProviderService>;
    let personService: DeepMocked<PersonService>;
    let organisationService: DeepMocked<OrganisationService>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [ConfigTestModule],
            providers: [
                FrontendController,
                { provide: ProviderService, useValue: createMock<ProviderService>() },
                { provide: PersonService, useValue: createMock<PersonService>() },
                { provide: OrganisationService, useValue: createMock<OrganisationService>() },
                { provide: OIDC_CLIENT, useValue: createMock<Client>() },
            ],
        }).compile();

        frontendController = module.get(FrontendController);
        oidcClient = module.get(OIDC_CLIENT);
        providerService = module.get(ProviderService);
        personService = module.get(PersonService);
        organisationService = module.get(OrganisationService);
        frontendConfig = module.get(ConfigService).getOrThrow<FrontendConfig>('FRONTEND');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    afterAll(async () => {
        await module.close();
    });

    it('should be defined', () => {
        expect(frontendController).toBeDefined();
    });

    describe('Login', () => {
        it('should redirect', () => {
            const responseMock: Response = createMock<Response>();
            const session: SessionData = { cookie: { originalMaxAge: 0 } };

            frontendController.login(responseMock, session);

            expect(responseMock.redirect).toHaveBeenCalled();
        });

        it('should redirect to saved redirectUrl', () => {
            const responseMock: Response = createMock<Response>();
            const sessionMock: SessionData = createMock<SessionData>({ redirectUrl: faker.internet.url() });

            frontendController.login(responseMock, sessionMock);

            expect(responseMock.redirect).toHaveBeenCalledWith(sessionMock.redirectUrl);
        });
    });

    describe('Logout', () => {
        function setupRequest(user?: User, logoutErr?: Error, destroyErr?: Error): Request {
            const sessionMock: DeepMocked<Session> = createMock<Session>();
            const requestMock: DeepMocked<Request> = createMock<Request>({
                session: sessionMock,
                user,
            });
            requestMock.logout.mockImplementationOnce((cb: (err: unknown) => void): void => {
                cb(logoutErr);
            });
            sessionMock.destroy.mockImplementationOnce((cb: (err: unknown) => void): Session => {
                cb(destroyErr);
                return sessionMock;
            });

            return requestMock;
        }

        it('should call request.logout', () => {
            const requestMock: Request = setupRequest();
            oidcClient.issuer.metadata = createMock<IssuerMetadata>({});

            frontendController.logout(requestMock, createMock());

            expect(requestMock.logout).toHaveBeenCalled();
        });

        it('should call session.destroy', () => {
            const requestMock: Request = setupRequest();
            oidcClient.issuer.metadata = createMock<IssuerMetadata>({});

            frontendController.logout(requestMock, createMock());

            expect(requestMock.logout).toHaveBeenCalled();
        });

        describe('when end_session_endpoint is defined', () => {
            it('should call endSessionUrl with correct params', () => {
                const user: User = createMock<User>({ id_token: faker.string.alphanumeric(32) });
                const requestMock: Request = setupRequest(user);
                oidcClient.issuer.metadata = createMock<IssuerMetadata>({ end_session_endpoint: faker.internet.url() });

                frontendController.logout(requestMock, createMock());

                expect(oidcClient.endSessionUrl).toHaveBeenCalledWith<[EndSessionParameters]>({
                    id_token_hint: user.id_token,
                    post_logout_redirect_uri: frontendConfig.LOGOUT_REDIRECT,
                    client_id: oidcClient.metadata.client_id,
                });
            });

            it('should redirect to return value of endSessionUrl', () => {
                const user: User = createMock<User>({ id_token: faker.string.alphanumeric(32) });
                const requestMock: Request = setupRequest(user);
                const responseMock: Response = createMock<Response>();
                oidcClient.issuer.metadata = createMock<IssuerMetadata>({ end_session_endpoint: faker.internet.url() });
                const endSessionUrl: string = faker.internet.url();
                oidcClient.endSessionUrl.mockReturnValueOnce(endSessionUrl);

                frontendController.logout(requestMock, responseMock);

                expect(responseMock.redirect).toHaveBeenCalledWith(endSessionUrl);
            });
        });

        describe('when end_session_endpoint is not defined', () => {
            it('should return to redirectUrl param', () => {
                const requestMock: Request = setupRequest();
                const responseMock: Response = createMock<Response>();
                oidcClient.issuer.metadata = createMock<IssuerMetadata>({ end_session_endpoint: undefined });

                frontendController.logout(requestMock, responseMock);

                expect(responseMock.redirect).toHaveBeenCalledWith(frontendConfig.LOGOUT_REDIRECT);
            });
        });

        describe('when request.logout fails', () => {
            it('should not throw error', () => {
                const requestMock: Request = setupRequest(undefined, new Error());

                expect(() => frontendController.logout(requestMock, createMock())).not.toThrow();
            });
        });

        describe('when session.destroy fails', () => {
            it('should not throw error', () => {
                const requestMock: Request = setupRequest(undefined, undefined, new Error());

                expect(() => frontendController.logout(requestMock, createMock())).not.toThrow();
            });
        });
    });

    describe('info', () => {
        it('should return user info', () => {
            const user: User = createMock<User>({ userinfo: createMock<OpenIdUserinfoResponse>() });

            const result: UserinfoResponse = frontendController.info(user);

            expect(result).toBeInstanceOf(UserinfoResponse);
        });
    });

    describe('provider', () => {
        it('should return providers', async () => {
            const providers: GetServiceProviderInfoDo[] = [
                { id: faker.string.uuid(), name: faker.hacker.noun(), url: faker.internet.url() },
            ];
            providerService.listProviders.mockResolvedValueOnce(providers);

            const result: GetServiceProviderInfoDo[] = await frontendController.provider(createMock<User>());

            expect(result).toEqual(providers);
        });
    });

    describe('personById', () => {
        const queryParams: PersonByIdParams = {
            personId: '1',
        };
        describe('when person exist', () => {
            it('should return person', async () => {
                const personenDatensatzResponse: PersonendatensatzResponse = getPersonenDatensatzResponse();
                personService.getPersonById.mockResolvedValueOnce(personenDatensatzResponse);
                const result: PersonendatensatzResponse = await frontendController.personById(
                    queryParams,
                    createMock(),
                );
                expect(result).toEqual(personenDatensatzResponse);
            });
        });
        describe('when error occurs', () => {
            it('should throw exception', async () => {
                const exception: HttpException = new HttpException(
                    'Requested Entity does not exist',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
                personService.getPersonById.mockRejectedValueOnce(exception);
                await expect(frontendController.personById(queryParams, createMock())).rejects.toThrow(HttpException);
            });
        });
    });

    describe('persons', () => {
        describe('when personen exist', () => {
            it('should return all persons', async () => {
                const pagedResponse: PagedResponse<PersonendatensatzResponse> = {
                    limit: 10,
                    total: 2,
                    offset: 0,
                    items: [getPersonenDatensatzResponse()],
                };
                personService.getAllPersons.mockResolvedValueOnce(pagedResponse);
                const result: PagedResponse<PersonendatensatzResponse> = await frontendController.persons(
                    createMock(),
                    createMock(),
                );
                expect(result).toEqual(pagedResponse);
            });
        });
        describe('when error occurs', () => {
            it('should throw exception', async () => {
                const exception: HttpException = new HttpException(
                    'Requested Entity does not exist',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
                personService.getAllPersons.mockRejectedValueOnce(exception);
                await expect(frontendController.persons(createMock(), createMock())).rejects.toThrow(HttpException);
            });
        });
    });

    describe('post personen', () => {
        describe('when personen exist', () => {
            it('should return all persons', async () => {
                const personNameParams: PersonNameParams = {
                    familienname: faker.person.lastName(),
                    vorname: faker.person.firstName(),
                };
                const createPersonBodyParams: CreatePersonBodyParams = {
                    mandant: faker.string.alpha(),
                    name: personNameParams,
                };
                const response: PersonendatensatzResponse = getPersonenDatensatzResponse();
                personService.createPerson.mockResolvedValueOnce(response);
                const result: PersonendatensatzResponse = await frontendController.createPerson(
                    createPersonBodyParams,
                    createMock(),
                );
                expect(result).toEqual(response);
            });
        });
        describe('when error occurs', () => {
            it('should throw exception', async () => {
                const exception: HttpException = new HttpException(
                    'Requested Entity does not exist',
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );
                personService.getAllPersons.mockRejectedValueOnce(exception);
                await expect(frontendController.persons(createMock(), createMock())).rejects.toThrow(HttpException);
            });
        });
    });

    describe('passwordReset', () => {
        describe('if personId is valid/person exists', () => {
            it('should return a new password as string', async () => {
                const generatedPassword: string = faker.string.alphanumeric({
                    length: { min: 10, max: 10 },
                    casing: 'mixed',
                });
                const params: PersonByIdParams = {
                    personId: faker.string.numeric(),
                };
                personService.resetPassword.mockResolvedValueOnce(generatedPassword);
                const result: string = await frontendController.passwordReset(params, createMock());
                expect(result).toEqual(generatedPassword);
            });
        });
        describe('if personId is not valid / person does not exist', () => {
            it('should throw exception', async () => {
                const params: PersonByIdParams = {
                    personId: faker.string.numeric(),
                };
                const exception: HttpException = new HttpException(
                    'Requested Entity does not exist',
                    HttpStatus.NOT_FOUND,
                );
                personService.resetPassword.mockRejectedValueOnce(exception);
                await expect(frontendController.passwordReset(params, createMock())).rejects.toThrow(HttpException);
            });
        });
    });

    describe('createOrganisation', () => {
        it('should call OrganisationService.create with correct params', () => {
            const organisation: CreateOrganisationBodyParams = {
                name: faker.string.alpha(16),
                kennung: faker.string.alpha(16),
                kuerzel: faker.string.alpha(3),
                namensergaenzung: faker.string.alpha(16),
                typ: OrganisationsTyp.UNBEST,
            };
            const user: User = createMock<User>();

            frontendController.createOrganisation(organisation, user);

            expect(organisationService.create).toHaveBeenCalledWith(organisation, user);
        });

        it('should return response', async () => {
            const response: OrganisationResponse = {
                id: faker.string.uuid(),
                name: faker.string.alpha(16),
                kennung: faker.string.alpha(16),
                kuerzel: faker.string.alpha(3),
                namensergaenzung: faker.string.alpha(16),
                typ: OrganisationsTyp.UNBEST,
            };
            organisationService.create.mockReturnValueOnce(of(response));

            const result: OrganisationResponse = await firstValueFrom(
                frontendController.createOrganisation(createMock(), createMock()),
            );

            expect(result).toEqual(response);
        });
    });

    describe('findOrganisationById', () => {
        it('should call OrganisationService.findById with correct params', () => {
            const organisationId: string = faker.string.uuid();
            const user: User = createMock<User>();

            frontendController.findOrganisationById({ organisationId }, user);

            expect(organisationService.findById).toHaveBeenCalledWith(organisationId, user);
        });

        it('should return response', async () => {
            const response: OrganisationResponse = {
                id: faker.string.uuid(),
                name: faker.string.alpha(16),
                kennung: faker.string.alpha(16),
                kuerzel: faker.string.alpha(3),
                namensergaenzung: faker.string.alpha(16),
                typ: OrganisationsTyp.UNBEST,
            };
            organisationService.findById.mockReturnValueOnce(of(response));

            const result: OrganisationResponse = await firstValueFrom(
                frontendController.findOrganisationById({ organisationId: response.id }, createMock()),
            );

            expect(result).toEqual(response);
        });
    });

    describe('findOrganisationen', () => {
        it('should call OrganisationService.find with correct params', () => {
            const queryParams: FindOrganisationQueryParams = {
                kennung: faker.string.alpha(16),
                name: faker.string.alpha(16),
                typ: OrganisationsTyp.UNBEST,
                limit: faker.number.int(50),
                offset: faker.number.int(50),
            };
            const user: User = createMock<User>();

            frontendController.findOrganisationen(queryParams, user);

            expect(organisationService.find).toHaveBeenCalledWith(queryParams, user);
        });

        it('should return response', async () => {
            const pagedResponse: PagedResponse<OrganisationResponse> = {
                limit: faker.number.int(100),
                offset: faker.number.int(100),
                total: faker.number.int(100),
                items: [
                    {
                        id: faker.string.uuid(),
                        name: faker.string.alpha(16),
                        kennung: faker.string.alpha(16),
                        kuerzel: faker.string.alpha(3),
                        namensergaenzung: faker.string.alpha(16),
                        typ: OrganisationsTyp.UNBEST,
                    },
                ],
            };
            organisationService.find.mockReturnValueOnce(of(pagedResponse));

            const result: PagedResponse<OrganisationResponse> = await firstValueFrom(
                frontendController.findOrganisationen(createMock(), createMock()),
            );

            expect(result).toEqual(pagedResponse);
        });
    });
});
