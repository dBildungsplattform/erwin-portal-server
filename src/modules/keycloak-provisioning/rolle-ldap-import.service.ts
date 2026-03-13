import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClassLogger } from '../../core/logging/class-logger.js';
import { DomainError } from '../../shared/error/domain.error.js';
import { Organisation } from '../organisation/domain/organisation.js';
import { RollenArt } from '../rolle/domain/rolle.enums.js';
import { RolleFactory } from '../rolle/domain/rolle.factory.js';
import { Rolle } from '../rolle/domain/rolle.js';
import { RolleRepo } from '../rolle/repo/rolle.repo.js';
import { ErwinLdapMappedRollenArt } from '../rollenmapping/domain/lms-rollenarten.enums.js';

@Injectable()
export class RolleLdapImportService {
    public constructor(
        private readonly logger: ClassLogger,
        private readonly rolleFactory: RolleFactory,
        private readonly rolleRepo: RolleRepo,
    ) {}

    public async findOrCreateRolle(
        parentOrg: Organisation<true>,
        paramsRolle: ErwinLdapMappedRollenArt,
    ): Promise<Rolle<true>> {
        this.logger.info(`Rolle Creation/Find Phase started for organisation: ${parentOrg.name}`);

        let existingRollen: Option<Rolle<true>[]> = await this.rolleRepo.findByName(parentOrg.name as string, false);
        if (existingRollen?.length) {
            existingRollen = existingRollen?.filter((rolle: Rolle<true>) => {
                return (
                    rolle.administeredBySchulstrukturknoten === parentOrg.id &&
                    rolle.rollenart === this.mapToRollenArt(paramsRolle)
                );
            });

            if (existingRollen.length === 1) {
                const rolle: Rolle<true> = existingRollen[0] as Rolle<true>;
                this.logger.info(
                    `Rolle '${rolle.name}' exists for organisation '${parentOrg.name}', fetching with id: ${rolle.id}`,
                );
                return rolle;
            } else {
                throw new ForbiddenException(
                    `More than one role exists for the parent organisation '${parentOrg.name}'`,
                );
            }
        } else {
            this.logger.info(`Rolle does not exist for organisation '${parentOrg.name}', creating new one`);

            const resultingRolle: Rolle<false> | DomainError = this.rolleFactory.createNew(
                `${parentOrg.name}`,
                parentOrg.id,
                this.mapToRollenArt(paramsRolle),
                [],
                [],
                [],
                [],
                false,
            );

            if (resultingRolle instanceof DomainError) {
                this.logger.error(`Failed to create new rolle for organisation '${parentOrg.name}'`, resultingRolle);
                throw resultingRolle;
            }
            const persistedRolle: Rolle<true> | DomainError = await this.rolleRepo.save(resultingRolle);

            if (persistedRolle instanceof DomainError) {
                this.logger.error(`Failed to save new rolle for organisation '${parentOrg.name}'`);
                throw persistedRolle;
            }

            this.logger.info(
                `Rolle '${persistedRolle.name}' successfully created for organisation '${parentOrg.name}' with id: ${persistedRolle.id}`,
            );
            return persistedRolle;
        }
    }

    private mapToRollenArt(role: ErwinLdapMappedRollenArt): RollenArt {
        const mapErwinToRollen: Record<ErwinLdapMappedRollenArt, RollenArt> = {
            [ErwinLdapMappedRollenArt.LERN]: RollenArt.LERN,
            [ErwinLdapMappedRollenArt.LEHR]: RollenArt.LEHR,
            [ErwinLdapMappedRollenArt.LEIT]: RollenArt.LEIT,
        };

        return mapErwinToRollen[role];
    }
}
