import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { OrganisationExternalIdType, OrganisationsTyp } from '../organisation/domain/organisation.enums.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { OrganisationRepository } from '../organisation/persistence/organisation.repository.js';
import { OrganisationScope } from '../organisation/persistence/organisation.scope.js';
import { KlasseLdapImportBodyParams } from './ldap/klasse-ldap-import.body.params.js';
import { SchuleLdapImportBodyParams } from './ldap/schule-ldap-import.body.params.js';

@Injectable()
export class OrganisationLdapImportService {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly organisationRepository: OrganisationRepository,
    ) {}

    public async createOrUpdateSchuleOrg(schuleLdapParams: SchuleLdapImportBodyParams): Promise<Organisation<true>> {
        this.logger.info('Schule Creation/Update Phase started');

        let persistedOrg: Organisation<true>;
        const externalIds: Partial<Record<OrganisationExternalIdType, string>> = {
            [OrganisationExternalIdType.LDAP]: schuleLdapParams.externalId,
        };

        const organisation: Organisation<true> | null = await this.organisationRepository.findOrganisationByExternalId(
            schuleLdapParams.name,
            schuleLdapParams.externalId,
            OrganisationExternalIdType.LDAP,
        );

        if (!organisation) {
            this.logger.info('Schule does not exist, creating new schule organistation');

            const newOrg: Organisation<false> = this.createOrganisation(
                schuleLdapParams.name,
                undefined,
                undefined,
                OrganisationsTyp.SCHULE,
                externalIds,
            );

            persistedOrg = await this.organisationRepository.save(newOrg);
            await this.organisationRepository.createExternalIdOrganisationMapping(
                schuleLdapParams.externalId,
                OrganisationExternalIdType.LDAP,
                persistedOrg,
            );
        } else {
            this.logger.info('Schule exists, updating existing schule organistation');

            this.assignSchuleParams(organisation, schuleLdapParams);
            persistedOrg = await this.organisationRepository.save(organisation);
        }
        this.logger.info('Schule saved successfully');

        return persistedOrg;
    }

    public async findOrCreateSchuleParentOrg(
        schuleOrg: Organisation<true>,
        zugehoerigZu: string,
    ): Promise<Organisation<true>> {
        const organisationScope: OrganisationScope = new OrganisationScope();
        organisationScope.findBy({
            name: `${schuleOrg.externalIds?.LDAP} Parent Org`,
            typ: OrganisationsTyp.LAND,
        });

        const existingParentOrganisation: Organisation<true> | undefined =
            await this.findOrganisationByScope(organisationScope);

        if (!existingParentOrganisation) {
            this.logger.info('Creating schule parent org');
            const newOrg: Organisation<false> = this.createOrganisation(
                `${schuleOrg.externalIds?.LDAP} Parent Org`,
                undefined,
                zugehoerigZu,
                OrganisationsTyp.LAND,
                {},
            );

            const persistedParentOrganization: Organisation<true> = await this.organisationRepository.save(newOrg);
            schuleOrg.zugehoerigZu = persistedParentOrganization.id;
            schuleOrg.administriertVon = persistedParentOrganization.id;
            await this.organisationRepository.save(schuleOrg);
            this.logger.info('Schule parent org successfully created');

            return persistedParentOrganization;
        } else {
            this.logger.info('Schule parent org exists, updating administriertVon and zugehoerigZu');

            existingParentOrganisation.zugehoerigZu = zugehoerigZu;
            schuleOrg.zugehoerigZu = existingParentOrganisation.id;
            schuleOrg.administriertVon = existingParentOrganisation.id;
            await this.organisationRepository.save(schuleOrg);
            this.logger.info('Schule Parent Org fields saved successfully');

            return existingParentOrganisation;
        }
    }

    public async createOrUpdateKlasse(
        klasseLdapParams: KlasseLdapImportBodyParams,
        schuleOrg: Organisation<true>,
    ): Promise<Organisation<true>> {
        this.logger.info('Klasse Creation/Update Phase started');

        let persistedOrg: Organisation<true>;
        const externalIds: Partial<Record<OrganisationExternalIdType, string>> = {
            [OrganisationExternalIdType.LDAP]: klasseLdapParams.externalId,
        };
        const organisation: Organisation<true> | null = await this.organisationRepository.findOrganisationByExternalId(
            klasseLdapParams.name,
            klasseLdapParams.externalId,
            OrganisationExternalIdType.LDAP,
        );

        if (!organisation) {
            this.logger.info('Klasse does not exist, creating new klasse organistation');

            const newOrg: Organisation<false> = this.createOrganisation(
                klasseLdapParams.name,
                schuleOrg.id,
                schuleOrg.id,
                OrganisationsTyp.KLASSE,
                externalIds,
            );

            persistedOrg = await this.organisationRepository.save(newOrg);
            await this.organisationRepository.createExternalIdOrganisationMapping(
                klasseLdapParams.externalId,
                OrganisationExternalIdType.LDAP,
                persistedOrg,
            );
        } else {
            this.logger.info('Klasse exists, updating existing klasse organistation');

            this.assignKlasseParams(organisation, klasseLdapParams);
            persistedOrg = await this.organisationRepository.save(organisation);
        }
        this.logger.info('Klasse saved successfully');

        return persistedOrg;
    }

    private assignSchuleParams(currentOrg: Organisation<true>, schuleLdapParams: SchuleLdapImportBodyParams): void {
        currentOrg.zugehoerigZu = schuleLdapParams.zugehoerigZu;
        currentOrg.name = schuleLdapParams.name;
        if (currentOrg.externalIds) {
            currentOrg.externalIds.LDAP = schuleLdapParams.externalId;
        } else {
            currentOrg.externalIds = {
                [OrganisationExternalIdType.LDAP]: schuleLdapParams.externalId,
            };
        }
    }

    private assignKlasseParams(currentOrg: Organisation<true>, klasseLdapParams: KlasseLdapImportBodyParams): void {
        currentOrg.name = klasseLdapParams.name;
        if (currentOrg.externalIds) {
            currentOrg.externalIds.LDAP = klasseLdapParams.externalId;
        } else {
            currentOrg.externalIds = { [OrganisationExternalIdType.LDAP]: klasseLdapParams.externalId };
        }
    }

    private async findOrganisationByScope(
        organisationScope: OrganisationScope,
    ): Promise<Organisation<true> | undefined> {
        const [orgs]: Counted<Organisation<true>> = await this.organisationRepository.findBy(organisationScope);

        if (orgs.length === 0) {
            this.logger.error(`Organisation with scope ${organisationScope.findBy.toString()} not found`);
            return undefined;
        } else if (orgs.length === 1) {
            return orgs[orgs.length - 1] as Organisation<true>;
        } else {
            this.logger.error(`More than one organisation exists with scope ${organisationScope.findBy.toString()}`);
            throw new ForbiddenException(
                `More than one organisation exists with scope ${organisationScope.findBy.toString()}`,
            );
        }
    }

    private createOrganisation(
        orgName: string,
        administriertVon: string | undefined,
        zugehoerigZu: string | undefined,
        organisationType: OrganisationsTyp,
        externalIds: Partial<Record<OrganisationExternalIdType, string>>,
    ): Organisation<false> {
        return Organisation.createNew(
            administriertVon,
            zugehoerigZu,
            undefined,
            orgName,
            undefined,
            undefined,
            organisationType,
            undefined,
            undefined,
            undefined,
            false,
            undefined,
            externalIds,
        ) as Organisation<false>;
    }
}
