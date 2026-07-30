import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Plane } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import {
  availability,
  advisoriesFor,
  bestFareFor,
  stopsLabel,
  formatMins,
  seatsNeeded,
  type PaxMix,
  type Advisory,
} from '../lib/flightRules';

const LEVEL_STYLE = {
  info: { bg: palette.infoLight, fg: palette.infoDark },
  caution: { bg: palette.warningLight, fg: palette.warningDark },
  warning: { bg: palette.errorLight, fg: palette.errorDark },
} as const;

export function FlightCard({
  flight,
  pax,
  expanded,
  compareMode,
  isChecked,
  canCheck,
  onToggleExpand,
  onToggleCheck,
  onSelectFare,
  selectLabel = 'Select fare',
}: {
  flight: MockFlight;
  pax: PaxMix;
  expanded: boolean;
  compareMode: boolean;
  isChecked: boolean;
  canCheck: boolean;
  onToggleExpand: () => void;
  onToggleCheck: () => void;
  onSelectFare: () => void;
  /** CTA copy — e.g. "Select flight" on multi-city results */
  selectLabel?: string;
}) {
  const avail = availability(flight, pax);
  const advisories = advisoriesFor(flight, pax);
  const best = bestFareFor(flight, pax);
  const blocked = avail.state === 'insufficient' || !best;

  const total = best ? best.quote.total : flight.price;
  const wasTotal = flight.originalPrice
    ? flight.originalPrice * seatsNeeded(pax)
    : null;

  const multiCarrier = flight.carriers.length > 1;
  const extraFlights = flight.segments.length - 1;

  const worst = advisories.find((a) => a.level === 'warning')
    ?? advisories.find((a) => a.level === 'caution');

  return (
    <View style={[s.card, isChecked && s.cardChecked, blocked && s.cardBlocked]}>
      {/* ── Summary ── */}
      <Pressable
        style={s.top}
        onPress={compareMode && !blocked ? onToggleCheck : undefined}
        disabled={compareMode && (blocked || (!canCheck && !isChecked))}
      >
        {/* Carrier mark */}
        {compareMode ? (
          <View style={[s.check, isChecked && s.checkOn]}>
            {isChecked && <Feather name="check" size={15} color={palette.white} />}
          </View>
        ) : multiCarrier ? (
          <View style={s.multi}>
            <Text variant="caption" style={{ color: palette.gray600, fontWeight: '700' }}>
              +{flight.carriers.length}
            </Text>
          </View>
        ) : (
          <View style={[s.logo, { backgroundColor: flight.airlineColor }]}>
            <Text variant="caption" style={{ color: palette.white, fontWeight: '700' }}>
              {flight.airlineCode}
            </Text>
          </View>
        )}

        {/* Times */}
        <View style={s.times}>
          <View>
            <Text style={s.time}>{flight.departTime}</Text>
            <Text variant="caption" color="textTertiary">
              {flight.origin} ({flight.originTerminal})
            </Text>
          </View>

          <View style={s.mid}>
            {flight.stops > 0 && (
              <Text variant="caption" color="textTertiary">
                {flight.stops}
              </Text>
            )}
            <Plane size={13} color={palette.gray600} />
          </View>

          <View>
            <View style={s.arriveRow}>
              <Text style={s.time}>{flight.arriveTime}</Text>
              {flight.arrivalDayOffset > 0 && (
                <Text style={s.dayBadge}>+{flight.arrivalDayOffset}</Text>
              )}
            </View>
            <Text variant="caption" color="textTertiary">
              {flight.destination} ({flight.destinationTerminal})
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={s.priceCol}>
          <Text style={s.price} numberOfLines={1}>
            ₹{total.toLocaleString()}
          </Text>
          {seatsNeeded(pax) > 1 && (
            <Text variant="caption" color="textTertiary">
              for {seatsNeeded(pax)}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Badges under the price */}
      <View style={s.badgeRow}>
        {avail.message && (
          <View
            style={[
              s.badge,
              avail.state === 'insufficient' ? s.badgeBad : s.badgeWarn,
            ]}
          >
            <Text
              variant="caption"
              style={{
                color:
                  avail.state === 'insufficient'
                    ? palette.errorDark
                    : palette.warningDark,
              }}
            >
              {avail.message}
            </Text>
          </View>
        )}

        {worst && (
          <View style={[s.badge, { backgroundColor: LEVEL_STYLE[worst.level].bg }]}>
            <Feather
              name={worst.icon as never}
              size={11}
              color={LEVEL_STYLE[worst.level].fg}
            />
            <Text variant="caption" style={{ color: LEVEL_STYLE[worst.level].fg }}>
              {worst.title}
            </Text>
          </View>
        )}

        <View style={[s.badge, flight.refundable ? s.badgeOk : s.badgeMuted]}>
          <Text
            variant="caption"
            style={{
              color: flight.refundable ? palette.successDark : palette.gray600,
            }}
          >
            {flight.refundable ? 'Refundable' : 'Non-refundable'}
          </Text>
        </View>

        {wasTotal && (
          <Text variant="caption" style={s.wasPrice}>
            ₹{wasTotal.toLocaleString()}
          </Text>
        )}
      </View>

      {/* ── Detail band ── */}
      <View style={s.band}>
        {expanded ? (
          <ExpandedBand
            flight={flight}
            pax={pax}
            advisories={advisories}
            blocked={blocked}
            fareName={best?.fare.name ?? 'Economy'}
            selectLabel={selectLabel}
            onSelectFare={onSelectFare}
            onCollapse={onToggleExpand}
          />
        ) : (
          <View style={s.collapsed}>
            <Pressable style={s.chip} onPress={onToggleExpand}>
              <Plane size={11} color={palette.primary600} />
              <Text variant="caption" style={{ color: palette.primary600, fontWeight: '600' }}>
                {flight.flightNumber.replace(' ', '')}
              </Text>
              {extraFlights > 0 && (
                <Text variant="caption" color="textTertiary">
                  +{extraFlights}
                </Text>
              )}
            </Pressable>

            <Text variant="caption" color="textSecondary" style={{ flex: 1 }} numberOfLines={1}>
              {stopsLabel(flight)} · {flight.duration}
            </Text>

            <Pressable
              style={[s.cta, blocked && s.ctaOff]}
              onPress={blocked ? undefined : onSelectFare}
              disabled={blocked}
            >
              <Text
                variant="caption"
                style={{ color: palette.white, fontWeight: '600' }}
              >
                {blocked ? 'Unavailable' : selectLabel}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Expanded ────────────────────────────────────────────

function ExpandedBand({
  flight,
  pax,
  advisories,
  blocked,
  fareName,
  selectLabel,
  onSelectFare,
  onCollapse,
}: {
  flight: MockFlight;
  pax: PaxMix;
  advisories: Advisory[];
  blocked: boolean;
  fareName: string;
  selectLabel: string;
  onSelectFare: () => void;
  onCollapse: () => void;
}) {
  const bookableFares = flight.fares.filter(
    (f) => f.seatsAtFare >= seatsNeeded(pax),
  ).length;

  return (
    <View style={s.expanded}>
      <View style={s.expandHead}>
        <Text variant="label" color="textTertiary" style={{ letterSpacing: 1 }}>
          {fareName.toUpperCase()}
        </Text>
        <Text variant="caption" color="textTertiary">
          {bookableFares === 0
            ? 'No fares for this party'
            : `Fares available (${bookableFares})`}
        </Text>
      </View>

      <Pressable style={s.expandChipRow} onPress={onCollapse}>
        <Plane size={13} color={palette.gray900} />
        <Text variant="bodyMedium">{flight.flightNumber.replace(' ', '')}</Text>
        <Text variant="bodySmall" color="textSecondary">
          {stopsLabel(flight)} · {flight.duration}
        </Text>
      </Pressable>

      {/* Segment breakdown when there are connections */}
      {flight.segments.length > 1 && (
        <View style={s.segments}>
          {flight.segments.map((seg, i) => (
            <View key={`${seg.marketingFlight}-${i}`}>
              <View style={s.segment}>
                <View style={s.segDot} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption">
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      {seg.departTime}
                    </Text>
                    {`  ${seg.origin} ${seg.originTerminal}  →  `}
                    <Text variant="caption" style={{ fontWeight: '600' }}>
                      {seg.arriveTime}
                    </Text>
                    {`  ${seg.destination} ${seg.destinationTerminal}`}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {seg.marketingFlight} · {seg.aircraft}
                    {seg.operatingCarrier
                      ? ` · operated by ${seg.operatingCarrier}`
                      : ''}
                  </Text>
                </View>
              </View>

              {flight.layovers[i] && (
                <View style={s.layover}>
                  <Text variant="caption" color="textTertiary">
                    {formatMins(flight.layovers[i].durationMin)} in{' '}
                    {flight.layovers[i].city}
                    {flight.layovers[i].terminalChange ? ' · terminal change' : ''}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Advisories */}
      {advisories.length > 0 && (
        <View style={s.advisories}>
          {advisories.slice(0, 3).map((a) => (
            <View
              key={a.id}
              style={[s.advisory, { backgroundColor: LEVEL_STYLE[a.level].bg }]}
            >
              <Feather
                name={a.icon as never}
                size={13}
                color={LEVEL_STYLE[a.level].fg}
              />
              <View style={{ flex: 1 }}>
                <Text
                  variant="caption"
                  style={{ color: LEVEL_STYLE[a.level].fg, fontWeight: '600' }}
                >
                  {a.title}
                </Text>
                <Text variant="caption" style={{ color: LEVEL_STYLE[a.level].fg }}>
                  {a.detail}
                </Text>
              </View>
            </View>
          ))}
          {advisories.length > 3 && (
            <Text variant="caption" color="textTertiary">
              +{advisories.length - 3} more to review before booking
            </Text>
          )}
        </View>
      )}

      {/* Inclusions */}
      <View style={s.rows}>
        <DetailRow icon="briefcase" label="Baggage" value={flight.baggage} />
        <DetailRow icon="coffee" label="Meal" value={flight.meal} />
        <DetailRow icon="x-circle" label="Cancellation" value={flight.cancellation} />
        <DetailRow icon="maximize-2" label="Seat pitch" value={flight.seatPitch} />
      </View>

      <Pressable
        style={[s.ctaWide, blocked && s.ctaOff]}
        onPress={blocked ? undefined : onSelectFare}
        disabled={blocked}
      >
        <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
          {blocked ? 'Not enough seats' : selectLabel}
        </Text>
      </Pressable>

      <Pressable style={s.collapseBtn} onPress={onCollapse} hitSlop={10}>
        <Feather name="chevron-up" size={18} color={palette.gray500} />
      </Pressable>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={s.detailRow}>
      <Feather name={icon as never} size={15} color={palette.gray600} />
      <Text variant="bodySmall" color="textSecondary" style={{ width: 92 }}>
        {label}
      </Text>
      <Text variant="bodySmall" style={{ flex: 1 }}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardChecked: { borderColor: palette.primary500, borderWidth: 2 },
  cardBlocked: { opacity: 0.72 },

  // Summary
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  multi: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },

  times: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: { fontSize: 18, fontWeight: '700', color: palette.gray900, lineHeight: 23 },
  arriveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  dayBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.warning,
    lineHeight: 15,
  },
  mid: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: spacing.sm },

  priceCol: { alignItems: 'flex-end', minWidth: 78 },
  price: { fontSize: 20, fontWeight: '700', color: palette.gray900, lineHeight: 25 },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.xs,
  },
  badgeOk: { backgroundColor: palette.successLight },
  badgeMuted: { backgroundColor: palette.gray100 },
  badgeWarn: { backgroundColor: palette.warningLight },
  badgeBad: { backgroundColor: palette.errorLight },
  wasPrice: { color: palette.gray400, textDecorationLine: 'line-through' },

  // Band
  band: {
    backgroundColor: palette.gray50,
    borderTopWidth: 1,
    borderTopColor: palette.gray200,
    borderStyle: 'dashed',
  },
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  cta: {
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: { backgroundColor: palette.gray400 },

  // Expanded
  expanded: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  expandHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  expandChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },

  segments: {
    borderLeftWidth: 2,
    borderLeftColor: palette.gray200,
    paddingLeft: spacing.md,
    marginLeft: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  segment: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingVertical: 5 },
  segDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: palette.gray400,
    marginTop: 5,
    marginLeft: -spacing.md - 4.5,
  },
  layover: {
    backgroundColor: palette.gray100,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginVertical: 4,
    alignSelf: 'flex-start',
  },

  advisories: { gap: 6, marginTop: spacing.sm, marginBottom: spacing.sm },
  advisory: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
  },

  rows: { marginTop: spacing.sm, gap: 2 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
  },

  ctaWide: {
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  collapseBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    minHeight: 40,
  },
});
