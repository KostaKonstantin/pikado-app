import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeagueMatch } from './entities/league-match.entity';

@Injectable()
export class FixtureService {
  constructor(
    @InjectRepository(LeagueMatch) private leagueMatchRepo: Repository<LeagueMatch>,
  ) {}

  private resolveGroupSize(playerCount: number): number {
    if (playerCount <= 12) return 4;
    if (playerCount <= 18) return 5;
    return 6;
  }

  async generateFixtures(
    leagueId: string,
    playerIds: string[],
    _homeAway: boolean = false,
  ): Promise<LeagueMatch[]> {
    const groupSize = this.resolveGroupSize(playerIds.length);

    // Build all pairs
    const remainingSet = new Set<string>();
    const playerRemaining = new Map<string, Set<string>>();

    for (const id of playerIds) {
      playerRemaining.set(id, new Set());
    }

    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        const a = playerIds[i];
        const b = playerIds[j];
        remainingSet.add(`${a}|||${b}`);
        playerRemaining.get(a)!.add(b);
        playerRemaining.get(b)!.add(a);
      }
    }

    const groups: { players: string[]; matches: [string, string][] }[] = [];

    // ─── Phase 1: main evenings — strict round-robin within one group ─────────
    // One group per evening; all players in the group play each other (remaining pairs only).
    // Exits early when the greedy can no longer form a group of ≥ 3 players,
    // handing the scattered tail over to the clearing phase.
    while (remainingSet.size > 0) {
      // Seed = player with most remaining pairs
      let seedPlayer = '';
      let maxRemaining = -1;
      for (const p of playerIds) {
        const cnt = playerRemaining.get(p)?.size ?? 0;
        if (cnt > maxRemaining) { maxRemaining = cnt; seedPlayer = p; }
      }
      if (!seedPlayer || maxRemaining === 0) break;

      const group: string[] = [seedPlayer];

      // Greedily add players that maximise unplayed pairs with current group members
      while (group.length < groupSize) {
        let bestCandidate = '';
        let bestScore = -1;
        for (const p of playerIds) {
          if (group.includes(p)) continue;
          let score = 0;
          for (const gp of group) {
            if (remainingSet.has(`${p}|||${gp}`) || remainingSet.has(`${gp}|||${p}`)) score++;
          }
          if (score > bestScore) { bestScore = score; bestCandidate = p; }
        }
        if (!bestCandidate || bestScore === 0) break;
        group.push(bestCandidate);
      }

      // Group too small for a meaningful main evening → hand off to clearing phase
      if (group.length < 3) break;

      // Commit: schedule and remove all remaining pairs within the group
      const groupMatches: [string, string][] = [];
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i]; const b = group[j];
          const key1 = `${a}|||${b}`; const key2 = `${b}|||${a}`;
          if (remainingSet.has(key1)) {
            groupMatches.push([a, b]);
            remainingSet.delete(key1);
            playerRemaining.get(a)?.delete(b);
            playerRemaining.get(b)?.delete(a);
          } else if (remainingSet.has(key2)) {
            groupMatches.push([b, a]);
            remainingSet.delete(key2);
            playerRemaining.get(a)?.delete(b);
            playerRemaining.get(b)?.delete(a);
          }
        }
      }

      if (groupMatches.length > 0) groups.push({ players: group, matches: groupMatches });
    }

    // ─── Phase 2: clearing evenings — consolidate scattered tail pairs ────────
    // Remaining pairs can no longer form full round-robin groups.
    // Each clearing evening: seed player + all their remaining opponents form a group,
    // and every unplayed pair within that group gets scheduled on the same evening.
    // This collapses what would be 4–6 one-match evenings into 1–2 denser evenings.
    const maxClearingSize = groupSize + 2;

    while (remainingSet.size > 0) {
      let seedPlayer = '';
      let maxRemaining = -1;
      for (const p of playerIds) {
        const cnt = playerRemaining.get(p)?.size ?? 0;
        if (cnt > maxRemaining) { maxRemaining = cnt; seedPlayer = p; }
      }
      if (!seedPlayer || maxRemaining === 0) break;

      // Clearing group: seed + remaining opponents (capped to avoid oversized evenings)
      const opponents = Array.from(playerRemaining.get(seedPlayer)!);
      const clearingGroup = [seedPlayer, ...opponents].slice(0, maxClearingSize);

      // Schedule ALL remaining pairs within the clearing group
      const clearingMatches: [string, string][] = [];
      for (let i = 0; i < clearingGroup.length; i++) {
        for (let j = i + 1; j < clearingGroup.length; j++) {
          const a = clearingGroup[i]; const b = clearingGroup[j];
          const key1 = `${a}|||${b}`; const key2 = `${b}|||${a}`;
          if (remainingSet.has(key1)) {
            clearingMatches.push([a, b]);
            remainingSet.delete(key1);
            playerRemaining.get(a)?.delete(b);
            playerRemaining.get(b)?.delete(a);
          } else if (remainingSet.has(key2)) {
            clearingMatches.push([b, a]);
            remainingSet.delete(key2);
            playerRemaining.get(a)?.delete(b);
            playerRemaining.get(b)?.delete(a);
          }
        }
      }

      if (clearingMatches.length > 0) groups.push({ players: clearingGroup, matches: clearingMatches });
    }

    // ─── Persist ─────────────────────────────────────────────────────────────
    const allMatches: LeagueMatch[] = [];
    let order = 0;
    for (let e = 0; e < groups.length; e++) {
      const eveningNum = e + 1;
      for (const [home, away] of groups[e].matches) {
        allMatches.push(
          this.leagueMatchRepo.create({
            leagueId,
            homePlayerId: home,
            awayPlayerId: away,
            roundNumber: eveningNum,
            sessionNumber: eveningNum,
            matchOrder: order++,
          }),
        );
      }
    }

    return this.leagueMatchRepo.save(allMatches);
  }
}
