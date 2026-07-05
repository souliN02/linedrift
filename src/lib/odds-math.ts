// The value engine: pure functions over decimal odds (SPEC §7). Everything math
// lives here — components and pages stay render-only (CLAUDE.md). Odds arrive as
// `number` from the read layer (getMatchSnapshots); a missing draw price is
// `null` and tolerated throughout.

import type { MatchSnapshot } from "@/db/queries";
import type { BookmakerOpenClose } from "@/lib/match-history";

/** Flag a price as "value" when its edge over consensus reaches this (3%). */
export const VALUE_THRESHOLD = 0.03;
/** Below this many quoting bookmakers there is no consensus, so no flags. */
export const MIN_CONSENSUS_BOOKMAKERS = 3;

export type OddsTriple = { home: number; draw: number | null; away: number };
export type ProbTriple = { home: number; draw: number | null; away: number };

/** Implied probability `1 / odds`; null for non-finite or non-positive odds. */
export function impliedProbability(odds: number): number | null {
  if (!Number.isFinite(odds) || odds <= 0) return null;
  return 1 / odds;
}

/**
 * Bookmaker margin: summed implied probabilities minus one. A null draw is a
 * two-way market (draw simply omitted). Null if home or away is unusable.
 */
export function overround(odds: OddsTriple): number | null {
  const home = impliedProbability(odds.home);
  const away = impliedProbability(odds.away);
  if (home === null || away === null) return null;
  const draw = odds.draw === null ? 0 : (impliedProbability(odds.draw) ?? 0);
  return home + draw + away - 1;
}

/**
 * No-vig (fair) probabilities: each implied probability divided by their sum so
 * the priced outcomes total one. Draw stays null when the market is two-way.
 */
export function noVigProbabilities(odds: OddsTriple): ProbTriple | null {
  const home = impliedProbability(odds.home);
  const away = impliedProbability(odds.away);
  if (home === null || away === null) return null;
  const draw = odds.draw === null ? null : impliedProbability(odds.draw);
  const sum = home + away + (draw ?? 0);
  if (sum <= 0) return null;
  return {
    home: home / sum,
    draw: draw === null ? null : draw / sum,
    away: away / sum,
  };
}

/** Edge of a price against a fair probability: `odds * fairProb - 1`. */
export function edge(odds: number, consensusFairProb: number): number {
  return odds * consensusFairProb - 1;
}

/** Whether an edge clears the value threshold (configurable). */
export function isValue(
  edgeValue: number,
  threshold = VALUE_THRESHOLD,
): boolean {
  return edgeValue >= threshold;
}

export type ConsensusProbabilities = {
  home: number;
  draw: number;
  away: number;
  bookmakerCount: number;
};

/**
 * Consensus fair probabilities: the mean of each bookmaker's no-vig probability
 * per outcome, over the latest snapshot set. Only bookmakers quoting a complete
 * home/draw/away line contribute — a two-way line (missing draw) renormalizes to
 * just home+away and would inflate those probabilities, so it is excluded.
 * Requires at least MIN_CONSENSUS_BOOKMAKERS contributing bookmakers, else null
 * (no consensus → no flags, SPEC §7).
 */
export function consensusProbabilities(
  latest: MatchSnapshot[],
): ConsensusProbabilities | null {
  const probs: { home: number; draw: number; away: number }[] = [];
  for (const row of latest) {
    if (row.drawOdds === null) continue;
    const p = noVigProbabilities({
      home: row.homeOdds,
      draw: row.drawOdds,
      away: row.awayOdds,
    });
    if (p === null || p.draw === null) continue;
    probs.push({ home: p.home, draw: p.draw, away: p.away });
  }

  if (probs.length < MIN_CONSENSUS_BOOKMAKERS) return null;

  const mean = (select: (p: (typeof probs)[number]) => number) =>
    probs.reduce((sum, p) => sum + select(p), 0) / probs.length;

  return {
    home: mean((p) => p.home),
    draw: mean((p) => p.draw),
    away: mean((p) => p.away),
    bookmakerCount: probs.length,
  };
}

export type BestPrice = {
  price: number;
  bookmakerKey: string;
  bookmakerTitle: string | null;
};
export type BestPrices = {
  home: BestPrice | null;
  draw: BestPrice | null;
  away: BestPrice | null;
};

type OutcomeKey = "home" | "draw" | "away";
const OUTCOME_ODDS: Record<OutcomeKey, (s: MatchSnapshot) => number | null> = {
  home: (s) => s.homeOdds,
  draw: (s) => s.drawOdds,
  away: (s) => s.awayOdds,
};

function bestPriceFor(
  latest: MatchSnapshot[],
  outcome: OutcomeKey,
): BestPrice | null {
  let best: BestPrice | null = null;
  for (const row of latest) {
    const price = OUTCOME_ODDS[outcome](row);
    // Strictly greater keeps the first bookmaker on a tie.
    if (price !== null && (best === null || price > best.price)) {
      best = {
        price,
        bookmakerKey: row.bookmakerKey,
        bookmakerTitle: row.bookmakerTitle,
      };
    }
  }
  return best;
}

/** Highest decimal odds per outcome across the latest snapshot set. */
export function bestPrices(latest: MatchSnapshot[]): BestPrices {
  return {
    home: bestPriceFor(latest, "home"),
    draw: bestPriceFor(latest, "draw"),
    away: bestPriceFor(latest, "away"),
  };
}

export type OutcomeFlags = { home: boolean; draw: boolean; away: boolean };
export type OutcomeEdges = {
  home: number | null;
  draw: number | null;
  away: number | null;
};

export type MatchSummary = {
  best: BestPrices;
  lowestOverround: number | null;
  consensus: ConsensusProbabilities | null;
  /** Edge of each best price vs consensus; null without a consensus. */
  bestEdges: OutcomeEdges;
  /** Whether each best price clears the value threshold. */
  value: OutcomeFlags;
  bookmakerCount: number;
};

/** Dashboard view-model for one match's latest snapshot set. */
export function summarizeMatch(latest: MatchSnapshot[]): MatchSummary {
  const best = bestPrices(latest);
  const consensus = consensusProbabilities(latest);

  const overrounds = latest
    .map((row) =>
      overround({ home: row.homeOdds, draw: row.drawOdds, away: row.awayOdds }),
    )
    .filter((o): o is number => o !== null);

  const edgeOf = (price: BestPrice | null, fair: number | null) =>
    price !== null && fair !== null ? edge(price.price, fair) : null;

  const bestEdges: OutcomeEdges = {
    home: edgeOf(best.home, consensus?.home ?? null),
    draw: edgeOf(best.draw, consensus?.draw ?? null),
    away: edgeOf(best.away, consensus?.away ?? null),
  };

  const flag = (e: number | null) => e !== null && isValue(e);

  return {
    best,
    lowestOverround: overrounds.length > 0 ? Math.min(...overrounds) : null,
    consensus,
    bestEdges,
    value: {
      home: flag(bestEdges.home),
      draw: flag(bestEdges.draw),
      away: flag(bestEdges.away),
    },
    bookmakerCount: latest.length,
  };
}

/**
 * Closing line value: how an earlier price compares to the same bookmaker's
 * closing (last pre-kickoff) price — `opening / closing − 1`. Positive means
 * the earlier price beat the close; consistently beating the close is the
 * classic test of whether "value" was real. Same-bookmaker comparison keeps
 * that book's vig on both sides of the ratio, so it largely cancels.
 * Guards mirror impliedProbability: null for non-finite or non-positive odds.
 */
export function clv(openingOdds: number, closingOdds: number): number | null {
  if (!Number.isFinite(openingOdds) || openingOdds <= 0) return null;
  if (!Number.isFinite(closingOdds) || closingOdds <= 0) return null;
  return openingOdds / closingOdds - 1;
}

export type ClvCell = {
  opening: number | null;
  closing: number | null;
  clv: number | null;
};
export type ClvRow = {
  bookmakerKey: string;
  bookmakerTitle: string | null;
  openedAt: Date;
  closedAt: Date;
  home: ClvCell;
  draw: ClvCell;
  away: ClvCell;
};

function clvCell(
  opening: number | null,
  closing: number | null,
  hasMovement: boolean,
): ClvCell {
  return {
    opening,
    closing,
    clv:
      hasMovement && opening !== null && closing !== null
        ? clv(opening, closing)
        : null,
  };
}

/**
 * Closing-line report rows, one per bookmaker, in the given order. A bookmaker
 * with a single pre-kickoff snapshot keeps its prices but gets null clv —
 * "no movement recorded" must read as a dash, not a misleading 0.0%.
 */
export function clvRows(lines: BookmakerOpenClose[]): ClvRow[] {
  return lines.map((line) => {
    const hasMovement = line.snapshotCount >= 2;
    return {
      bookmakerKey: line.bookmakerKey,
      bookmakerTitle: line.bookmakerTitle,
      openedAt: line.opening.capturedAt,
      closedAt: line.closing.capturedAt,
      home: clvCell(line.opening.homeOdds, line.closing.homeOdds, hasMovement),
      draw: clvCell(line.opening.drawOdds, line.closing.drawOdds, hasMovement),
      away: clvCell(line.opening.awayOdds, line.closing.awayOdds, hasMovement),
    };
  });
}

export type ClvHeadline = {
  bookmakerKey: string;
  bookmakerTitle: string | null;
  outcome: OutcomeKey;
  clv: number;
};

/**
 * The single largest open→close move by magnitude across every bookmaker and
 * outcome (a big drift against the opener is as newsworthy as a big beat).
 * Strictly-greater comparison keeps the first row/outcome on a tie; null when
 * nothing was computable.
 */
export function biggestClvMove(rows: ClvRow[]): ClvHeadline | null {
  let best: ClvHeadline | null = null;
  for (const row of rows) {
    for (const outcome of ["home", "draw", "away"] as const) {
      const value = row[outcome].clv;
      if (value === null) continue;
      if (best === null || Math.abs(value) > Math.abs(best.clv)) {
        best = {
          bookmakerKey: row.bookmakerKey,
          bookmakerTitle: row.bookmakerTitle,
          outcome,
          clv: value,
        };
      }
    }
  }
  return best;
}

export type OutcomeCell = {
  odds: number | null;
  implied: number | null;
  noVig: number | null;
  edge: number | null;
  isValue: boolean;
  isBest: boolean;
};
export type EnrichedRow = {
  bookmakerKey: string;
  bookmakerTitle: string | null;
  capturedAt: Date;
  overround: number | null;
  home: OutcomeCell;
  draw: OutcomeCell;
  away: OutcomeCell;
};

function buildCell(
  odds: number | null,
  fairNoVig: number | null,
  consensusFair: number | null,
  best: BestPrice | null,
): OutcomeCell {
  const e =
    odds !== null && consensusFair !== null ? edge(odds, consensusFair) : null;
  return {
    odds,
    implied: odds === null ? null : impliedProbability(odds),
    noVig: fairNoVig,
    edge: e,
    isValue: e !== null && isValue(e),
    isBest: best !== null && odds !== null && odds === best.price,
  };
}

/**
 * Detail-table view-model: every latest row enriched with implied/no-vig
 * probabilities, overround, and per-outcome edge vs consensus, best-price
 * markers, and value flags. With no consensus, edges are null and nothing is
 * flagged, but best-price highlighting still applies.
 */
export function enrichRows(
  latest: MatchSnapshot[],
  consensus: ConsensusProbabilities | null,
  best: BestPrices,
): EnrichedRow[] {
  return latest.map((row) => {
    const noVig = noVigProbabilities({
      home: row.homeOdds,
      draw: row.drawOdds,
      away: row.awayOdds,
    });
    return {
      bookmakerKey: row.bookmakerKey,
      bookmakerTitle: row.bookmakerTitle,
      capturedAt: row.capturedAt,
      overround: overround({
        home: row.homeOdds,
        draw: row.drawOdds,
        away: row.awayOdds,
      }),
      home: buildCell(
        row.homeOdds,
        noVig?.home ?? null,
        consensus?.home ?? null,
        best.home,
      ),
      draw: buildCell(
        row.drawOdds,
        noVig?.draw ?? null,
        consensus?.draw ?? null,
        best.draw,
      ),
      away: buildCell(
        row.awayOdds,
        noVig?.away ?? null,
        consensus?.away ?? null,
        best.away,
      ),
    };
  });
}
