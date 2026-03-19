import { BaseEntity, Cascade, Entity, Enum, ManyToOne, PrimaryKeyProp, Property, Rel } from '@mikro-orm/core';
import { OrganisationExternalIdType } from '../domain/organisation.enums.js';
import { OrganisationEntity } from './organisation.entity.js';

@Entity({ tableName: 'external_id_organisation_mapping' })
export class OrganisationExternalIdMappingEntity extends BaseEntity {
    @ManyToOne({
        columnType: 'uuid',
        primary: true,
        cascade: [Cascade.REMOVE],
        ref: true,
        nullable: false,
        entity: () => OrganisationEntity,
    })
    public organisation!: Rel<OrganisationEntity>;

    @Enum({ primary: true, items: () => OrganisationExternalIdType, nativeEnumName: 'organisation_external_id_enum' })
    public type!: OrganisationExternalIdType;

    @Property()
    public externalId!: string;

    public [PrimaryKeyProp]?: ['organisation', 'type'];
}
