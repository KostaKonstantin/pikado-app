export enum ClubRole {
  CLUB_ADMIN = 'club_admin',
  ORGANIZER = 'organizer',
  VIEWER = 'viewer',
}

export enum TournamentFormat {
  SINGLE_ELIMINATION = 'single_elimination',
  DOUBLE_ELIMINATION = 'double_elimination',
  ROUND_ROBIN = 'round_robin',
  GROUP_KNOCKOUT = 'group_knockout',
}

export enum TournamentStatus {
  DRAFT = 'draft',
  REGISTRATION = 'registration',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum MatchStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BYE = 'bye',
}

export enum LeagueStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum LeagueFormat {
  HOME_AWAY = 'home_away',
  SINGLE = 'single',
}
