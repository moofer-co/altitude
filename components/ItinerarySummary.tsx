import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Plane } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import type { BookingItinerary, BookingSegment } from '../data/bookingItinerary';
import { tripModeLabel } from '../data/bookingItinerary';

/**
 * Global-standard trip summary for one-way, round-trip, multi-city,
 * and connecting sectors — date once, route once, no repeated chrome.
 */
export function ItinerarySummary({
  itinerary,
  open,
  onToggle,
}: {
  itinerary: BookingItinerary;
  open: boolean;
  onToggle: () => void;
}) {
  const primary = itinerary.segments[0];
  const dateSpan = dateSpanLabel(itinerary.segments);

  return (
    <View style={s.wrap}>
      <Pressable style={[s.head, open && s.headOpen]} onPress={onToggle}>
        <CarrierStack segments={itinerary.segments} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {itinerary.title}
          </Text>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {tripModeLabel(itinerary.mode)}
            {dateSpan ? ` · ${dateSpan}` : ''}
            {` · ₹${itinerary.flightTotal.toLocaleString()}`}
          </Text>
        </View>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={palette.gray400}
        />
      </Pressable>

      {open && (
        <View style={s.body}>
          {itinerary.segments.map((seg, i) => (
            <SectorRow
              key={seg.legId}
              segment={seg}
              showLabel={itinerary.segments.length > 1 || itinerary.mode !== 'oneWay'}
              last={i === itinerary.segments.length - 1}
            />
          ))}
        </View>
      )}

      {!open && primary && itinerary.segments.length === 1 && (
        <View style={s.collapsedHint}>
          <Text variant="caption" color="textTertiary">
            {primary.depart}–{primary.arrive}
            {primary.arriveOffset > 0 ? ` +${primary.arriveOffset}` : ''}
            {' · '}
            {primary.stops === 0
              ? 'Non-stop'
              : `${primary.stops} stop${primary.stops > 1 ? 's' : ''}${
                  primary.stopCity ? ` ${primary.stopCity}` : ''
                }`}
            {' · '}
            {primary.fareName}
          </Text>
        </View>
      )}
    </View>
  );
}

function dateSpanLabel(segments: BookingSegment[]): string {
  if (segments.length === 0) return '';
  if (segments.length === 1) return segments[0].dateLabel;
  const first = segments[0].dateLabel;
  const last = segments[segments.length - 1].dateLabel;
  if (first === last) return first;
  // Shorten "Wed, 5 Aug" → "5–21 Aug" when same month possible
  const short = (d: string) => d.replace(/^[A-Za-z]{3},\s*/, '');
  return `${short(first)} – ${short(last)}`;
}

function CarrierStack({ segments }: { segments: BookingSegment[] }) {
  const unique = segments.filter(
    (s, i, arr) => arr.findIndex((x) => x.airlineCode === s.airlineCode) === i,
  );
  if (unique.length === 0) {
    return <View style={[s.mark, { backgroundColor: palette.primary500 }]} />;
  }
  if (unique.length === 1) {
    return (
      <View style={[s.mark, { backgroundColor: unique[0].airlineColor }]}>
        <Text style={s.markText}>{unique[0].airlineCode}</Text>
      </View>
    );
  }
  return (
    <View style={s.stack}>
      {unique.slice(0, 3).map((seg, i) => (
        <View
          key={seg.airlineCode}
          style={[
            s.stackDot,
            {
              backgroundColor: seg.airlineColor,
              marginLeft: i === 0 ? 0 : -10,
              zIndex: 3 - i,
            },
          ]}
        >
          <Text style={s.stackDotText}>{seg.airlineCode.slice(0, 2)}</Text>
        </View>
      ))}
    </View>
  );
}

function SectorRow({
  segment,
  showLabel,
  last,
}: {
  segment: BookingSegment;
  showLabel: boolean;
  last: boolean;
}) {
  const connection =
    segment.stops > 0
      ? `${segment.stops} stop${segment.stops > 1 ? 's' : ''}${
          segment.stopCity ? ` · ${segment.stopCity}` : ''
        }`
      : 'Non-stop';

  const perks: string[] = [];
  if (segment.seatComplimentary) perks.push('Free seats');
  if (segment.mealComplimentary) perks.push('Meal');
  if (segment.refundable) perks.push('Refundable');
  if (segment.changed) perks.push('Changed');

  return (
    <View style={[s.sector, !last && s.sectorGap]}>
      {showLabel && (
        <View style={s.sectorLabelRow}>
          <Text style={s.sectorLabel}>{segment.label}</Text>
          <Text variant="caption" color="textTertiary">
            {segment.dateLabel}
          </Text>
        </View>
      )}
      {!showLabel && (
        <Text variant="caption" color="textTertiary" style={{ marginBottom: 8 }}>
          {segment.dateLabel}
        </Text>
      )}

      <View style={s.timeline}>
        <View style={s.endpoint}>
          <Text style={s.time}>{segment.depart}</Text>
          <Text style={s.iata}>{segment.from}</Text>
          <Text variant="caption" color="textTertiary">
            {segment.originTerminal}
          </Text>
        </View>

        <View style={s.mid}>
          <Text variant="caption" color="textTertiary" align="center">
            {segment.duration}
          </Text>
          <View style={s.line}>
            <View style={s.dot} />
            {segment.stops > 0 && segment.stopCity ? (
              <>
                <View style={s.rule} />
                <View style={s.stopPill}>
                  <Text style={s.stopPillText}>{segment.stopCity}</Text>
                </View>
                <View style={s.rule} />
              </>
            ) : (
              <>
                <View style={s.rule} />
                <Plane size={12} color={palette.primary600} />
                <View style={s.rule} />
              </>
            )}
            <View style={s.dot} />
          </View>
          <Text variant="caption" color="textTertiary" align="center">
            {connection}
          </Text>
        </View>

        <View style={[s.endpoint, { alignItems: 'flex-end' }]}>
          <Text style={s.time}>
            {segment.arrive}
            {segment.arriveOffset > 0 ? (
              <Text style={s.plus}> +{segment.arriveOffset}</Text>
            ) : null}
          </Text>
          <Text style={s.iata}>{segment.to}</Text>
          <Text variant="caption" color="textTertiary">
            {segment.destTerminal}
          </Text>
        </View>
      </View>

      <View style={s.meta}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="bodySmall" numberOfLines={1} style={{ fontWeight: '600' }}>
            {segment.airline} {segment.flightNumber}
          </Text>
          <Text variant="caption" color="textTertiary" numberOfLines={1}>
            {segment.fareName}
            {perks.length > 0 ? ` · ${perks.join(' · ')}` : ''}
          </Text>
        </View>
        <Text style={s.price}>₹{segment.price.toLocaleString()}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: palette.gray50,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 64,
  },
  headOpen: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  collapsedHint: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    marginTop: -4,
  },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: palette.white, fontSize: 12, fontWeight: '700' },
  stack: { flexDirection: 'row', width: 48, alignItems: 'center' },
  stackDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.white,
  },
  stackDotText: { color: palette.white, fontSize: 8, fontWeight: '700' },

  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  sector: { paddingTop: spacing.md },
  sectorGap: {
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray200,
  },
  sectorLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: palette.gray500,
    textTransform: 'uppercase',
  },

  timeline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  endpoint: { width: 64 },
  time: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.gray900,
    letterSpacing: -0.3,
  },
  plus: { fontSize: 11, fontWeight: '700', color: palette.warningDark },
  iata: { fontSize: 13, fontWeight: '700', color: palette.gray900, marginTop: 2 },
  mid: { flex: 1, alignItems: 'center', gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary300,
  },
  rule: { flex: 1, height: 1, backgroundColor: palette.primary200 },
  stopPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.primary200,
  },
  stopPillText: { fontSize: 10, fontWeight: '700', color: palette.primary700 },

  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  price: { fontSize: 15, fontWeight: '700', color: palette.gray900 },
});
