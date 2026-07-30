import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import type { MockFlight } from '../data/flights';
import type { BookingSegment } from '../data/bookingItinerary';
import {
  amenityRowsForSource,
  amenitySourceFromFlight,
  amenitySourceFromSegment,
  serviceIconsForSource,
  type AmenityRow,
  type AmenitySource,
} from '../lib/flightAmenities';

type Props = {
  flight?: MockFlight;
  segment?: BookingSegment;
  source?: AmenitySource;
  onDetails?: () => void;
  /** Fewer policy rows for tight surfaces */
  compact?: boolean;
};

function resolveSource(props: Props): AmenitySource | null {
  if (props.source) return props.source;
  if (props.flight) return amenitySourceFromFlight(props.flight);
  if (props.segment) return amenitySourceFromSegment(props.segment);
  return null;
}

/**
 * Reference-style amenities block — policy list + service icon row.
 */
export function FlightAmenities({
  onDetails,
  compact,
  ...props
}: Props) {
  const src = resolveSource(props);
  if (!src) return null;

  const rows = amenityRowsForSource(src);
  const shown = compact ? rows.filter((r) => r.included).slice(0, 3) : rows;
  const services = serviceIconsForSource(src);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Feather name="grid" size={14} color={palette.gray600} />
        <Text variant="bodySmall" style={{ fontWeight: '700', flex: 1 }}>
          Flight Amenities
        </Text>
      </View>

      {shown.map((row) => (
        <AmenityLine key={row.id} row={row} />
      ))}

      <View style={s.foot}>
        <View style={s.serviceRow}>
          {services.map((svc) => (
            <View
              key={svc.id}
              style={[s.serviceIcon, !svc.included && s.serviceIconOff]}
              accessibilityLabel={`${svc.label}${svc.included ? '' : ' not included'}`}
            >
              <Feather
                name={svc.icon as never}
                size={14}
                color={svc.included ? palette.primary600 : palette.gray300}
              />
            </View>
          ))}
        </View>
        {onDetails && (
          <Pressable onPress={onDetails} hitSlop={8} style={s.details}>
            <Text
              variant="caption"
              style={{ color: palette.primary600, fontWeight: '700' }}
            >
              Details
            </Text>
            <Feather name="chevron-right" size={14} color={palette.primary600} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Icon strip only — for collapsed cards / itinerary footer. */
export function AmenityIconRow({
  flight,
  segment,
  source,
  dimMissing = true,
}: {
  flight?: MockFlight;
  segment?: BookingSegment;
  source?: AmenitySource;
  dimMissing?: boolean;
}) {
  const src =
    source ??
    (flight
      ? amenitySourceFromFlight(flight)
      : segment
        ? amenitySourceFromSegment(segment)
        : null);
  if (!src) return null;

  const services = serviceIconsForSource(src);
  return (
    <View style={s.serviceRow}>
      {services
        .filter((svc) => (dimMissing ? true : svc.included))
        .map((svc) => (
          <View
            key={svc.id}
            style={[
              s.serviceIcon,
              !svc.included && dimMissing && s.serviceIconOff,
            ]}
          >
            <Feather
              name={svc.icon as never}
              size={13}
              color={svc.included ? palette.primary600 : palette.gray300}
            />
          </View>
        ))}
    </View>
  );
}

function AmenityLine({ row }: { row: AmenityRow }) {
  return (
    <View style={s.line}>
      <View style={[s.lineIcon, !row.included && s.lineIconOff]}>
        <Feather
          name={row.icon as never}
          size={14}
          color={row.included ? palette.gray700 : palette.gray400}
        />
      </View>
      <Text
        variant="bodySmall"
        style={{
          flex: 1,
          color: row.included ? palette.gray900 : palette.gray500,
        }}
        numberOfLines={1}
      >
        {row.label}
      </Text>
      {row.included && (
        <Feather name="check" size={14} color={palette.success} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    backgroundColor: palette.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    gap: 2,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 8,
  },
  lineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineIconOff: { backgroundColor: palette.gray100 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.gray200,
  },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serviceIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: palette.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceIconOff: { backgroundColor: palette.gray50 },
  details: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
