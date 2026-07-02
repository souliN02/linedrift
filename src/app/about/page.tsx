import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import type { MatchSnapshot } from "@/db/queries";
import { formatPercent, formatSignedPercent } from "@/lib/format";
import {
  bestPrices,
  clv,
  consensusProbabilities,
  edge,
  impliedProbability,
  isValue,
  MIN_CONSENSUS_BOOKMAKERS,
  noVigProbabilities,
  overround,
  VALUE_THRESHOLD,
} from "@/lib/odds-math";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How LineDrift builds its own historical odds dataset under a 500-credit-a-month API budget, and the no-vig consensus maths behind the value flags.",
};

// The page is pure explanation — no database read — so it renders statically.
// The worked example below runs the real value-engine functions so every number
// on the page is authentic (SPEC §7), never hand-typed.
const EXAMPLE: MatchSnapshot[] = [
  {
    bookmakerKey: "pinnacle",
    bookmakerTitle: "Pinnacle",
    homeOdds: 2.1,
    drawOdds: 3.4,
    awayOdds: 3.6,
    capturedAt: new Date(0),
  },
  {
    bookmakerKey: "bet365",
    bookmakerTitle: "Bet365",
    homeOdds: 2.08,
    drawOdds: 3.35,
    awayOdds: 3.65,
    capturedAt: new Date(0),
  },
  {
    bookmakerKey: "betfair",
    bookmakerTitle: "Betfair",
    homeOdds: 2.36,
    drawOdds: 3.3,
    awayOdds: 3.4,
    capturedAt: new Date(0),
  },
];

const SAMPLE = EXAMPLE[0]; // Pinnacle — the single-book walkthrough row.
const SAMPLE_TRIPLE = {
  home: SAMPLE.homeOdds,
  draw: SAMPLE.drawOdds,
  away: SAMPLE.awayOdds,
};

// One number per fact, computed once. `null` is impossible for this hand-picked
// complete line, so the ?? keeps types clean without polluting the JSX.
const impliedHome = impliedProbability(SAMPLE.homeOdds) ?? 0;
const impliedDraw = impliedProbability(SAMPLE.drawOdds ?? 0) ?? 0;
const impliedAway = impliedProbability(SAMPLE.awayOdds) ?? 0;
const sampleOverround = overround(SAMPLE_TRIPLE) ?? 0;
const sampleNoVig = noVigProbabilities(SAMPLE_TRIPLE);
const consensus = consensusProbabilities(EXAMPLE);
const best = bestPrices(EXAMPLE);
const bestHome = best.home;
const homeEdge =
  bestHome && consensus ? edge(bestHome.price, consensus.home) : 0;
const homeIsValue = isValue(homeEdge);
// Betfair's 2.36 opener against a 2.21 close — the CLV walkthrough number.
const exampleClv = clv(2.36, 2.21) ?? 0;

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-heading mt-1.5 text-xl font-bold tracking-tight">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

// One node in the pipeline diagram: a mono title over a muted sub-label.
function Node({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="font-mono text-xs font-medium text-foreground">
        {title}
      </div>
      <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{sub}</div>
    </div>
  );
}

function Arrow() {
  return (
    <span
      aria-hidden
      className="rotate-90 text-center text-muted-foreground sm:rotate-0"
    >
      →
    </span>
  );
}

// Divides the sum-to-one no-vig probabilities into the illustrative table cell.
function ProbRow({
  book,
  odds,
}: {
  book: string;
  odds: { home: number; draw: number | null; away: number };
}) {
  const p = noVigProbabilities(odds);
  const cell = (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : formatPercent(v);
  return (
    <tr className="border-t border-border">
      <td className="py-1.5 pr-3 text-foreground">{book}</td>
      <td className="py-1.5 pr-3 text-right tabular-nums">
        {odds.home.toFixed(2)}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">
        {odds.draw === null ? "—" : odds.draw.toFixed(2)}
      </td>
      <td className="py-1.5 pr-3 text-right tabular-nums">
        {odds.away.toFixed(2)}
      </td>
      <td className="py-1.5 text-right tabular-nums text-muted-foreground">
        {cell(p?.home)}
      </td>
    </tr>
  );
}

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <header className="mb-10">
        <p className="eyebrow">About the project</p>
        <h1 className="font-heading mt-1.5 text-3xl font-bold tracking-tight">
          How LineDrift works
        </h1>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Free odds APIs only give you the <em>current</em> price. History is
          paywalled. So LineDrift builds its own dataset — snapshotting
          bookmaker odds every four hours — and turns that time series into
          no-vig consensus probabilities and value flags. It is a data pipeline
          built under a real constraint, not a CRUD demo.
        </p>
      </header>

      <div className="space-y-10">
        <Section eyebrow="Why it exists" title="A dataset built under a budget">
          <p>
            The Odds API&apos;s free tier gives{" "}
            <span className="text-foreground">500 credits a month</span>, and
            its historical endpoints cost 10× the live ones. Rather than pay for
            history, LineDrift manufactures it: a scheduled job records the{" "}
            <span className="text-foreground">match-winner (1X2)</span> market
            for the <span className="text-foreground">Premier League</span>,{" "}
            <span className="text-foreground">Danish Superliga</span>, and —
            while it is on — the{" "}
            <span className="text-foreground">FIFA World Cup</span> in decimal
            odds across EU bookmakers, and stores every reading in Postgres.
          </p>
          <p>
            The whole project is designed around that ceiling — which is exactly
            the story worth telling. Every architectural choice below falls out
            of it.
          </p>
        </Section>

        <Section eyebrow="Architecture" title="From cron to chart">
          <div className="mt-1 space-y-5 text-foreground">
            <div>
              <p className="eyebrow mb-2">Ingest · every 4 hours</p>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Node title="GitHub Actions" sub="cron, every 4h" />
                <Arrow />
                <Node title="/api/cron/snapshot" sub="bearer-auth route" />
                <Arrow />
                <Node title="The Odds API" sub="h2h · 3 sport keys" />
                <Arrow />
                <Node title="Neon Postgres" sub="odds_snapshots" />
              </div>
            </div>
            <div>
              <p className="eyebrow mb-2">Serve · per request</p>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <Node title="Neon Postgres" sub="time series" />
                <Arrow />
                <Node title="Server components" sub="read + value engine" />
                <Arrow />
                <Node title="Your browser" sub="tables + charts" />
              </div>
            </div>
          </div>
          <p>
            The only endpoint that writes is the snapshot route, guarded by a
            bearer secret and safe to retry. Every other page reads Postgres
            directly in a React Server Component. Raw API JSON is validated by
            Zod at a single boundary, so the rest of the app never sees an
            untrusted shape.
          </p>
        </Section>

        <Section
          eyebrow="The value engine"
          title="Turning prices into probabilities"
        >
          <p>
            A bookmaker&apos;s odds bake in their margin. The value engine
            strips that out, builds a consensus fair price from the market, and
            flags any bookmaker paying meaningfully more than consensus. Here is
            the whole chain on a sample match — the numbers below are computed
            live by the same functions the app runs.
          </p>

          <ol className="space-y-4">
            <Step n={1} label="Implied probability" formula="p = 1 / odds">
              Pinnacle&apos;s {SAMPLE.homeOdds.toFixed(2)} home price implies{" "}
              <Mono>{formatPercent(impliedHome)}</Mono>, the draw{" "}
              <Mono>{formatPercent(impliedDraw)}</Mono>, the away{" "}
              <Mono>{formatPercent(impliedAway)}</Mono>.
            </Step>

            <Step n={2} label="Overround (the vig)" formula="Σ implied − 1">
              Those three add up to more than 100%. The excess —{" "}
              <Mono>{formatPercent(sampleOverround)}</Mono> here — is the
              bookmaker&apos;s margin, shown per book on every match.
            </Step>

            <Step
              n={3}
              label="No-vig probability"
              formula="implied / Σ implied"
            >
              Dividing each implied probability by their sum removes the margin,
              leaving a fair line that totals 100%: home{" "}
              <Mono>{sampleNoVig ? formatPercent(sampleNoVig.home) : "—"}</Mono>
              , draw{" "}
              <Mono>
                {sampleNoVig?.draw != null
                  ? formatPercent(sampleNoVig.draw)
                  : "—"}
              </Mono>
              , away{" "}
              <Mono>{sampleNoVig ? formatPercent(sampleNoVig.away) : "—"}</Mono>
              .
            </Step>

            <Step
              n={4}
              label="Consensus"
              formula={`mean no-vig, ≥ ${MIN_CONSENSUS_BOOKMAKERS} books`}
            >
              Averaging the no-vig probabilities across all bookmakers quoting a
              full line gives the market&apos;s consensus. With fewer than{" "}
              {MIN_CONSENSUS_BOOKMAKERS} books there is no consensus and nothing
              is flagged. For this sample:{" "}
              {consensus ? (
                <Mono>
                  home {formatPercent(consensus.home)} · draw{" "}
                  {formatPercent(consensus.draw)} · away{" "}
                  {formatPercent(consensus.away)}
                </Mono>
              ) : (
                <Mono>no consensus</Mono>
              )}
              .
            </Step>

            <Step
              n={5}
              label="Best price & edge"
              formula="odds × consensus − 1"
            >
              The best home price is{" "}
              <Mono>{bestHome ? bestHome.price.toFixed(2) : "—"}</Mono> at{" "}
              {bestHome?.bookmakerTitle ?? "—"}. Against consensus that is an
              edge of{" "}
              {homeIsValue ? (
                <Badge variant="value">{formatSignedPercent(homeEdge)}</Badge>
              ) : (
                <Mono>{formatSignedPercent(homeEdge)}</Mono>
              )}{" "}
              — at or above the {formatPercent(VALUE_THRESHOLD, 0)} threshold,
              so it is flagged as value.
            </Step>

            <Step n={6} label="Closing line value" formula="open / close − 1">
              Once a match kicks off, every earlier price is graded against the
              closing line — each bookmaker&apos;s last pre-kickoff quote, the
              market&apos;s most informed estimate. An opener of 2.36 against a
              2.21 close works out to{" "}
              <Mono>{formatSignedPercent(exampleClv)}</Mono>: beating the close
              consistently is the classic test of whether &quot;value&quot; was
              real. Finished matches get a closing-line report on their detail
              page.
            </Step>
          </ol>

          <div className="mt-2 overflow-x-auto rounded-lg border border-border bg-card p-4">
            <p className="eyebrow mb-3">Sample match · no-vig home %</p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="pb-1 text-left font-medium">Book</th>
                  <th className="pb-1 pr-3 text-right font-medium">Home</th>
                  <th className="pb-1 pr-3 text-right font-medium">Draw</th>
                  <th className="pb-1 pr-3 text-right font-medium">Away</th>
                  <th className="pb-1 text-right font-medium">No-vig home</th>
                </tr>
              </thead>
              <tbody>
                {EXAMPLE.map((s) => (
                  <ProbRow
                    key={s.bookmakerKey}
                    book={s.bookmakerTitle ?? s.bookmakerKey}
                    odds={{
                      home: s.homeOdds,
                      draw: s.drawOdds,
                      away: s.awayOdds,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section eyebrow="The budget" title="500 credits, spent on purpose">
          <p>
            One snapshot costs{" "}
            <span className="text-foreground">regions × markets</span> credits
            per league — two credits a run for the domestic leagues, three while
            the World Cup has fixtures (its key bills nothing between
            tournaments). Running every four hours keeps even a World Cup month
            inside the free tier.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value="6" label="runs / day" />
            <Stat value="2–3" label="credits / run" />
            <Stat value="~360" label="typical / month" />
            <Stat value="500" label="free tier" />
          </div>
          <p>
            Off-season a run is two credits, so usage sits near ~360 a month; a
            World Cup month rises to ~486 — still under 500. Development and
            tests never touch the live API; a single saved response fixture
            powers all of it, and the schedule is the only knob if credits run
            low.
          </p>
        </Section>
      </div>

      <p className="mt-12 rounded-lg border border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
        Educational analytics project. Not betting advice.
      </p>
    </main>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-foreground tabular-nums">{children}</span>
  );
}

function Step({
  n,
  label,
  formula,
  children,
}: {
  n: number;
  label: string;
  formula: string;
  children: React.ReactNode;
}) {
  return (
    <li className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-mono text-xs font-medium text-foreground">
          {n}. {label}
        </span>
        <code className="font-mono text-xs text-muted-foreground">
          {formula}
        </code>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {children}
      </p>
    </li>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-center">
      <div className="font-mono text-xl font-semibold text-foreground tabular-nums">
        {value}
      </div>
      <div className="mt-0.5 text-[0.7rem] text-muted-foreground">{label}</div>
    </div>
  );
}
