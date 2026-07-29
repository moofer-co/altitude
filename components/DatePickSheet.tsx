import { useMemo, useState, useEffect } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Button, Sheet } from './ui';
import { palette, spacing, radii } from '../constants/tokens';
import { getMonthName } from '../data/prices';

const CELL = (Dimensions.get('window').width - spacing.lg * 2) / 7;

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function formatShortDate(iso: string) {
  const d = parseISO(iso);
  return `${d.getDate()} ${getMonthName(d.getMonth()).slice(0, 3)}`;
}

/**
 * Lightweight single-date picker for multi-city legs.
 */
export function DatePickSheet({
  visible,
  title = 'Select date',
  selected,
  minDate,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title?: string;
  selected: string | null;
  minDate?: string | null;
  onClose: () => void;
  onSelect: (iso: string) => void;
}) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const floor = useMemo(() => {
    if (!minDate) return today;
    const m = parseISO(minDate);
    return m > today ? m : today;
  }, [minDate, today]);

  const [cursor, setCursor] = useState(() => startOfMonth(floor));
  const [draft, setDraft] = useState<string | null>(selected);

  useEffect(() => {
    if (visible) {
      setDraft(selected);
      setCursor(startOfMonth(selected ? parseISO(selected) : floor));
    }
  }, [visible, selected, floor]);

  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const total = daysInMonth(cursor);
    const startPad = first.getDay();
    const out: Array<{
      key: string;
      iso: string | null;
      label: string;
      disabled: boolean;
    }> = [];

    for (let i = 0; i < startPad; i++) {
      out.push({ key: `pad-${i}`, iso: null, label: '', disabled: true });
    }
    for (let day = 1; day <= total; day++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      const iso = toISO(date);
      out.push({
        key: iso,
        iso,
        label: String(day),
        disabled: date < floor,
      });
    }
    return out;
  }, [cursor, floor]);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} heightRatio={0.72}>
      <View style={s.nav}>
        <Pressable
          hitSlop={10}
          onPress={() => setCursor((c) => addMonths(c, -1))}
          style={s.navBtn}
        >
          <Feather name="chevron-left" size={20} color={palette.gray700} />
        </Pressable>
        <Text variant="bodyMedium">
          {getMonthName(cursor.getMonth())} {cursor.getFullYear()}
        </Text>
        <Pressable
          hitSlop={10}
          onPress={() => setCursor((c) => addMonths(c, 1))}
          style={s.navBtn}
        >
          <Feather name="chevron-right" size={20} color={palette.gray700} />
        </Pressable>
      </View>

      <View style={s.week}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text
            key={`${d}-${i}`}
            variant="caption"
            color="textTertiary"
            style={s.weekDay}
          >
            {d}
          </Text>
        ))}
      </View>

      <View style={s.grid}>
        {cells.map((cell) => {
          const on = cell.iso != null && cell.iso === draft;
          return (
            <Pressable
              key={cell.key}
              disabled={!cell.iso || cell.disabled}
              onPress={() => cell.iso && setDraft(cell.iso)}
              style={[s.cell, on && s.cellOn]}
            >
              <Text
                variant="bodySmall"
                style={{
                  color: on
                    ? palette.white
                    : cell.disabled
                      ? palette.gray300
                      : palette.gray900,
                  fontWeight: on ? '700' : '500',
                }}
              >
                {cell.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.footer}>
        <Button
          label={draft ? `Continue · ${formatShortDate(draft)}` : 'Select a date'}
          onPress={() => {
            if (!draft) return;
            onSelect(draft);
            onClose();
          }}
          disabled={!draft}
          rounded
        />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gray50,
  },
  week: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  weekDay: {
    width: CELL,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CELL / 2,
  },
  cellOn: {
    backgroundColor: palette.primary500,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: 'auto' as unknown as number,
  },
});
