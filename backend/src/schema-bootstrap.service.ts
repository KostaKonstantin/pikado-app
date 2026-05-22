import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SchemaBootstrapService implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.dataSource.query(`
      ALTER TABLE "leagues"
        ADD COLUMN IF NOT EXISTS "rank_snapshots" jsonb NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS "rank_movements" jsonb NOT NULL DEFAULT '{}'
    `);

    await this.dataSource.query(`
      ALTER TABLE "competition_phases"
        ADD COLUMN IF NOT EXISTS "dnf_player_ids" jsonb NOT NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "dnf_records" jsonb NOT NULL DEFAULT '[]'
    `);

    await this.dataSource.query(`
      ALTER TABLE "league_matches"
        ADD COLUMN IF NOT EXISTS "is_dnf_result" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "dnf_player_id" varchar NULL,
        ADD COLUMN IF NOT EXISTS "dnf_applied_at" timestamptz NULL
    `);
  }
}
