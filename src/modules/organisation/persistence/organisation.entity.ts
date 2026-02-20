import { AutoMap } from '@automapper/classes';
import { BigIntType, Entity, Enum, Index, Opt, Property, OneToMany, Cascade, Collection } from '@mikro-orm/core';
import { TimestampedEntity } from '../../../persistence/timestamped.entity.js';
import { OrganisationExternalIdMappingEntity } from './external-id-organisation-mappings.entity.js';
import { OrganisationsTyp, Traegerschaft } from '../domain/organisation.enums.js';

@Entity({ tableName: 'organisation' })
export class OrganisationEntity extends TimestampedEntity {
    public constructor() {
        super();
    }

    @AutoMap()
    @Index({ name: 'organisation_administriert_von_index' })
    @Property({ columnType: 'uuid', nullable: true })
    public administriertVon?: string;

    @AutoMap()
    @Property({ columnType: 'uuid', nullable: true })
    public zugehoerigZu?: string;

    @AutoMap()
    @Property({ nullable: true })
    public kennung?: string;

    @AutoMap()
    @Property({ nullable: true })
    public name?: string;

    @AutoMap()
    @Property({ nullable: true })
    public namensergaenzung?: string;

    @AutoMap()
    @Property({ nullable: true })
    public kuerzel?: string;

    @AutoMap(() => String)
    @Index({ name: 'organisation_typ_index' })
    @Enum({ items: () => OrganisationsTyp, nullable: true, nativeEnumName: 'organisations_typ_enum' })
    public typ?: OrganisationsTyp;

    @AutoMap(() => String)
    @Enum({ items: () => Traegerschaft, nullable: true, nativeEnumName: 'traegerschaft_enum' })
    public traegerschaft?: Traegerschaft;

    @Property({ nullable: true })
    public emailDomain?: string;

    @Property({ nullable: true })
    public emailAddress?: string;

    @Property({ default: false })
    public itslearningEnabled!: boolean;

    @Property({ type: new BigIntType('number'), defaultRaw: '1', concurrencyCheck: true })
    public version!: number & Opt;

    @AutoMap()
    @Property({ columnType: 'uuid', nullable: true })
    public lernmanagementsystem?: string;

    @OneToMany({
        entity: () => OrganisationExternalIdMappingEntity,
        mappedBy: 'organisation',
        cascade: [Cascade.REMOVE, Cascade.PERSIST],
        orphanRemoval: true,
        eager: true,
    })
    public externalIds?: Collection<OrganisationExternalIdMappingEntity> =
        new Collection<OrganisationExternalIdMappingEntity>(this);
}
