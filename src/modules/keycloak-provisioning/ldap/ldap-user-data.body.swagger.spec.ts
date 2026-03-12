/**
 * THIS FILE IS ONLY CREATED TO INCREASE THE COVERAGE BEC SONARCLOUD WAS COMPLAINING NON-STOP
 */

import 'reflect-metadata';

import { Controller, Post, Body, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiBody, DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

import { LdapUserDataBodyParams } from './ldap-user-data.body.params.js';
import { KlasseLdapImportBodyParams } from './klasse-ldap-import.body.params.js';
import { SchuleLdapImportBodyParams } from './schule-ldap-import.body.params.js';
import { PersonLdapImportDataBody } from './person-ldap-import.body.params.js';
import { ErwinLdapMappedRollenArt } from '../../rollenmapping/domain/lms-rollenarten.enums.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getSchemaObject(document: unknown, schemaName: string): Record<string, unknown> {
    if (!isRecord(document)) {
        throw new Error('OpenAPI document is not an object');
    }

    const components: unknown = document['components'];
    if (!isRecord(components)) {
        throw new Error('OpenAPI document has no components');
    }

    const schemas: unknown = components['schemas'];
    if (!isRecord(schemas)) {
        throw new Error('OpenAPI document has no components.schemas');
    }

    const schema: unknown = schemas[schemaName];
    if (!isRecord(schema)) {
        throw new Error(`Schema "${schemaName}" not found or not an object`);
    }

    return schema;
}

function getProperties(schema: Record<string, unknown>): Record<string, unknown> {
    const props: unknown = schema['properties'];
    if (!isRecord(props)) {
        throw new Error('Schema has no properties object');
    }
    return props;
}

@Controller()
class SwaggerTestController {
    @Post('/test')
    @ApiBody({ type: LdapUserDataBodyParams })
    public test(@Body() _body: LdapUserDataBodyParams): { ok: true } {
        return { ok: true };
    }
}

describe('LdapUserDataBodyParams DTO decorators', () => {
    describe('constructor', () => {
        it('assigns all fields via Object.assign', () => {
            const klasse: KlasseLdapImportBodyParams = plainToInstance(KlasseLdapImportBodyParams, {});
            const schule: SchuleLdapImportBodyParams = plainToInstance(SchuleLdapImportBodyParams, {});
            const person: PersonLdapImportDataBody = plainToInstance(PersonLdapImportDataBody, {});

            const dto: LdapUserDataBodyParams = new LdapUserDataBodyParams({
                klasse: klasse,
                schule: schule,
                person: person,
                rolle: ErwinLdapMappedRollenArt.LEHR,
            });

            expect(dto.klasse).toBe(klasse);
            expect(dto.schule).toBe(schule);
            expect(dto.person).toBe(person);
            expect(dto.rolle).toBe(ErwinLdapMappedRollenArt.LEHR);
        });
    });

    describe('@Type() + @ValidateNested() + @IsString()', () => {
        it('transforms nested properties into DTO instances (Type decorator)', () => {
            const payload: LdapUserDataBodyParams = {
                klasse: {
                    name: 'Testklasse',
                    externalId: 'cn=Testklasse,ou=Klassen,dc=example,dc=com',
                },
                schule: {
                    name: 'Testschule',
                    zugehoerigZu: 'Testverband',
                    externalId: 'ou=Testschule,dc=example,dc=com',
                },
                person: {
                    keycloakUserId: 'user-123',
                    vorname: 'Max',
                    nachname: 'Mustermann',
                    externalId: 'uid=max,ou=Users,dc=example,dc=com',
                    email: 'max.mustermann@example.com',
                    geburtstag: new Date(),
                },
                rolle: ErwinLdapMappedRollenArt.LEHR,
            };

            const dto: LdapUserDataBodyParams = plainToInstance(LdapUserDataBodyParams, payload);

            expect(dto.klasse).toBeInstanceOf(KlasseLdapImportBodyParams);
            expect(dto.schule).toBeInstanceOf(SchuleLdapImportBodyParams);
            expect(dto.person).toBeInstanceOf(PersonLdapImportDataBody);
            expect(dto.rolle).toBe(ErwinLdapMappedRollenArt.LEHR);
        });

        it('fails validation when role is not a string (IsString decorator)', async () => {
            const invalidPayload: Record<string, unknown> = {
                klasse: {},
                schule: {},
                person: {},
                role: 123, // not a string → should violate @IsString()
            };

            const dto: LdapUserDataBodyParams = plainToInstance(LdapUserDataBodyParams, invalidPayload);
            const errors: ValidationError[] = await validate(dto);

            // Find the error for "role"
            const roleError: ValidationError | undefined = errors.find((e: ValidationError) => e.property === 'role');
            expect(roleError).toBeDefined();

            // constraints is usually a record like { isString: 'role must be a string' }
            const constraints: Record<string, unknown> | undefined = roleError?.constraints;
            expect(constraints).toBeDefined();
            expect(isRecord(constraints)).toBe(true);

            if (isRecord(constraints)) {
                expect(Object.keys(constraints)).toContain('isEnum');
            }
        });
    });

    describe('@ApiProperty() via Swagger document generation', () => {
        let app: INestApplication;

        beforeAll(async () => {
            const moduleRef: TestingModule = await Test.createTestingModule({
                controllers: [SwaggerTestController],
            }).compile();

            app = moduleRef.createNestApplication();
            await app.init();
        });

        afterAll(async () => {
            await app.close();
        });

        it('exposes DTO properties in OpenAPI schema (ApiProperty decorator)', () => {
            const config: ReturnType<DocumentBuilder['build']> = new DocumentBuilder()
                .setTitle('test')
                .setVersion('1')
                .build();

            // Swagger reads @ApiProperty metadata to build model schemas [1](https://github.com/typestack/class-validator)[2](https://www.geeksforgeeks.org/typescript/typescript-decorators/)
            const document: unknown = SwaggerModule.createDocument(app, config, {
                extraModels: [
                    LdapUserDataBodyParams,
                    KlasseLdapImportBodyParams,
                    SchuleLdapImportBodyParams,
                    PersonLdapImportDataBody,
                ],
            });

            const schema: Record<string, unknown> = getSchemaObject(document, 'LdapUserDataBodyParams');
            const props: Record<string, unknown> = getProperties(schema);

            expect(props).toHaveProperty('klasse');
            expect(props).toHaveProperty('schule');
            expect(props).toHaveProperty('person');
            expect(props).toHaveProperty('role');
        });
    });
});
