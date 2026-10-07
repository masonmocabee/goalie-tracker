export interface Game {
  id: string;
  date: string; // ISO date, YYYY-MM-DD
  opponent: string;
  homeAway?: 'home' | 'away';
  rink?: string;
  numPeriods: number;
  periodLengthMin?: number;
  final?: boolean; // set by "End game"
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export type EventType = 'save' | 'goal';

// Regulation periods are numbered 1..numPeriods; OT is always available.
export type Period = number | 'OT';

export type NetZone =
  | 'glove_high'
  | 'blocker_high'
  | 'glove_low'
  | 'blocker_low'
  | 'five_hole'
  | 'left_pad_low' // goalie's left (glove side)
  | 'right_pad_low' // goalie's right (blocker side)
  | 'unknown';

export type GoalReason =
  | 'screen'
  | 'rebound'
  | 'deflection'
  | 'breakaway'
  | 'odd_man_rush'
  | 'cross_crease'
  | 'wraparound'
  | 'bad_angle'
  | 'scramble'
  | 'soft_goal'
  | 'other';

/** Where a goal was shot from, as fractions (0-1) across and down the half-rink diagram (net at the top). */
export interface ShotOrigin {
  x: number;
  y: number;
}

export type Strength = 'EV' | 'PP' | 'PK';

export interface ShotEvent {
  id: string;
  gameId: string;
  type: EventType;
  period: Period;
  sortKey: number;
  highDanger: boolean;
  gameClock?: string; // "MM:SS", label only
  netZone?: NetZone;
  reason?: GoalReason;
  strength?: Strength;
  shotOrigin?: ShotOrigin; // goals only
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export const NET_ZONE_LABELS: Record<NetZone, string> = {
  glove_high: 'Glove high',
  blocker_high: 'Blocker high',
  glove_low: 'Glove low',
  blocker_low: 'Blocker low',
  five_hole: 'Five hole',
  left_pad_low: 'Left pad low',
  right_pad_low: 'Right pad low',
  unknown: 'Unknown',
};

export const GOAL_REASON_LABELS: Record<GoalReason, string> = {
  screen: 'Screen',
  rebound: 'Rebound',
  deflection: 'Deflection',
  breakaway: 'Breakaway',
  odd_man_rush: 'Odd-man rush',
  cross_crease: 'Cross-crease',
  wraparound: 'Wraparound',
  bad_angle: 'Bad angle',
  scramble: 'Scramble',
  soft_goal: 'Soft goal',
  other: 'Other',
};

export const HIGH_DANGER_HELP =
  'Tag a shot as high danger if it came from the slot or inner slot, was a rebound, breakaway, ' +
  'odd-man rush, cross-crease pass, or a tip/deflection in close. Consistency matters more than precision.';
