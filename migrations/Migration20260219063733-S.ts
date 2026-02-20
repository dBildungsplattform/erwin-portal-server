import { Migration } from '@mikro-orm/migrations';

export class Migration20260219063733 extends Migration {
    public override async up(): Promise<void> {
        this.addSql('create type "organisation_external_id_enum" as enum (\'LDAP\');');
        this.addSql(
            'create table "external_id_organisation_mapping" ("organisation_id" uuid not null, "type" "organisation_external_id_enum" not null, "external_id" varchar(255) not null, constraint "external_id_organisation_mapping_pkey" primary key ("organisation_id", "type"));',
        );

        this.addSql(
            'alter table "external_id_organisation_mapping" add constraint "external_id_organisation_mapping_organisation_id_foreign" foreign key ("organisation_id") references "organisation" ("id") on delete cascade;',
        );

        this.addSql('alter type "rollen_system_recht_enum" add value if not exists \'SERVICEPROVIDER_VERWALTEN\';');

        this.addSql('alter type "service_provider_kategorie_enum" add value if not exists \'LMS\';');
    }

    public override async down(): Promise<void> {
        this.addSql('drop table if exists "external_id_organisation_mapping" cascade;');

        this.addSql('drop type "organisation_external_id_enum";');
    }
}
