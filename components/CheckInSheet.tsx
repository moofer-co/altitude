import { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Text, Sheet, Plane } from './ui';
import { PickerSheet } from './PickerSheet';
import { palette, spacing, radii } from '../constants/tokens';
import {
  timeOf,
  dateOf,
  documentsRequired,
  validateDocument,
  documentComplete,
  canUndoCheckIn,
  NATIONALITIES,
  dangerousGoods,
  type Trip,
  type TripPassenger,
  type TravelDocument,
} from '../data/trip';

const HPAD = spacing.lg;

type Step = 'select' | 'documents' | 'declare' | 'done';

/** Keeps a DD/MM/YYYY shape as the user types, without fighting deletion. */
function maskDate(raw: string, previous: string): string {
  const deleting = raw.length < previous.length;
  if (deleting && raw.endsWith('/')) return raw.slice(0, -1);
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)]
    .filter(Boolean)
    .join('/');
}

// ═══════════════════════════════════════════════════════════
// Barcode
// ═══════════════════════════════════════════════════════════

/** Deterministic bar widths so a pass looks the same every time it opens. */
function barsFor(seed: string, count: number): number[] {
  const out: number[] = [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(1 + (h % 3));
  }
  return out;
}

function Barcode({ seed }: { seed: string }) {
  const bars = useMemo(() => barsFor(seed, 58), [seed]);
  return (
    <View style={s.barcode}>
      {bars.map((w, i) => (
        <View
          key={i}
          style={{
            width: w,
            height: 44,
            backgroundColor: i % 2 === 0 ? palette.gray900 : 'transparent',
            marginRight: 1.5,
          }}
        />
      ))}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Check-in
// ═══════════════════════════════════════════════════════════

export function CheckInSheet({
  visible,
  trip,
  onClose,
  onComplete,
  onViewPasses,
}: {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
  onComplete: (passengerIds: string[], docs: TravelDocument[]) => void;
  onViewPasses: () => void;
}) {
  const [step, setStep] = useState<Step>('select');
  const [selected, setSelected] = useState<string[]>([]);
  const [docs, setDocs] = useState<Record<string, TravelDocument>>({});
  const [docIndex, setDocIndex] = useState(0);
  const [docTouched, setDocTouched] = useState(false);
  const [declared, setDeclared] = useState(false);
  const [showNat, setShowNat] = useState(false);

  const seg = trip.segments[0];
  const needsDocs = documentsRequired(trip);

  // Infants travel on a lap and are not issued a boarding pass
  const eligible = useMemo(
    () => trip.passengers.filter((p) => p.type !== 'infant' && !p.checkedIn),
    [trip.passengers],
  );

  useEffect(() => {
    if (!visible) return;
    setStep('select');
    setSelected(eligible.map((p) => p.id));
    setDocIndex(0);
    setDocTouched(false);
    setDeclared(false);
    // Seed from passport data captured at booking
    const seeded: Record<string, TravelDocument> = {};
    trip.documents.forEach((d) => {
      seeded[d.passengerId] = { ...d };
    });
    // For anyone without a doc, seed from the trip data
    for (const p of trip.passengers) {
      if (!seeded[p.id] && p.type !== 'infant') {
        seeded[p.id] = {
          passengerId: p.id,
          passportNumber: '',
          nationality: 'Indian',
          issuingCountry: 'India',
          expiry: '',
        };
      }
    }
    setDocs(seeded);
  }, [visible, eligible, trip.documents]);

  const noSeat = trip.passengers.filter(
    (p) => selected.includes(p.id) && !p.seat,
  );

  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  const docFor = (id: string): TravelDocument =>
    docs[id] ?? {
      passengerId: id,
      passportNumber: '',
      nationality: 'Indian',
      issuingCountry: 'India',
      expiry: '',
    };

  const currentId = selected[docIndex];
  const currentDoc = currentId ? docFor(currentId) : null;
  const docErrors = currentDoc
    ? validateDocument(currentDoc, seg.departISO)
    : {};

  const setDocField = (field: keyof TravelDocument, value: string) => {
    if (!currentId) return;
    setDocs((d) => ({
      ...d,
      [currentId]: { ...docFor(currentId), [field]: value },
    }));
  };

  const allDocsValid = selected.every((id) =>
    documentComplete(docs[id], seg.departISO),
  );

  const advanceDoc = () => {
    setDocTouched(true);
    if (Object.keys(docErrors).length > 0) return;
    if (docIndex < selected.length - 1) {
      setDocIndex((i) => i + 1);
      setDocTouched(false);
    } else {
      setStep('declare');
    }
  };

  const allDocsReady = needsDocs && selected.every((id) =>
    documentComplete(docs[id], seg.departISO),
  );

  // Everyone was already checked in before this sheet opened
  const allDone =
    eligible.length === 0 &&
    trip.passengers.some((p) => p.checkedIn);

  const startNext = () => {
    if (selected.length === 0) return;
    if (needsDocs && !allDocsReady) {
      setStep('documents');
    } else {
      setStep('declare');
    }
  };

  const footer =
    step === 'select' ? (
      allDone ? (
        <Pressable style={s.cta} onPress={onViewPasses}>
          <Feather name="credit-card" size={18} color={palette.white} />
          <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600', marginLeft: spacing.sm }}>
            View boarding passes
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={[s.cta, selected.length === 0 && s.ctaOff]}
          onPress={startNext}
          disabled={selected.length === 0}
        >
          <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
            {selected.length === 0
              ? 'Select at least one traveller'
              : `Continue with ${selected.length}`}
          </Text>
        </Pressable>
      )
    ) : step === 'documents' ? (
      <View style={s.footerRow}>
        {docIndex > 0 && (
          <Pressable
            style={s.ghost}
            onPress={() => {
              setDocIndex((i) => i - 1);
              setDocTouched(false);
            }}
          >
            <Feather name="chevron-left" size={18} color={palette.gray700} />
          </Pressable>
        )}
        <Pressable style={[s.cta, { flex: 1 }]} onPress={advanceDoc}>
          <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
            {docIndex < selected.length - 1 ? 'Next traveller' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    ) : step === 'declare' ? (
      <Pressable
        style={[s.cta, !declared && s.ctaOff]}
        onPress={() => {
          if (!declared) return;
          onComplete(selected, selected.map((id) => docFor(id)));
          setStep('done');
        }}
        disabled={!declared}
      >
        <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
          {declared ? 'Confirm check-in' : 'Accept the declaration'}
        </Text>
      </Pressable>
    ) : (
      <Pressable style={s.cta} onPress={onClose}>
        <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
          Done
        </Text>
      </Pressable>
    );

  const title =
    step === 'select'
      ? 'Web check-in'
      : step === 'documents'
        ? 'Travel documents'
        : step === 'declare'
          ? 'Before we check you in'
          : 'You are checked in';

  const subtitle =
    step === 'done'
      ? 'Boarding passes are ready'
      : step === 'documents'
        ? `Traveller ${docIndex + 1} of ${selected.length}`
        : `${seg.marketingFlight} · ${dateOf(seg.departISO)} · ${timeOf(seg.departISO)}`;

  return (
    <>
      <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      heightRatio={0.9}
      footer={footer}
    >
      <ScrollView
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
      >
        {/* ── Who ── */}
        {step === 'select' && allDone && (
          <View style={s.allDone}>
            <View style={s.allDoneIcon}>
              <Feather name="check" size={30} color={palette.white} />
            </View>
            <Text variant="h2" align="center">
              You are all checked in
            </Text>
            <Text variant="bodySmall" color="textSecondary" align="center">
              Everyone on this booking has a boarding pass. Open them any time from
              your trip.
            </Text>

            <View style={s.allDoneList}>
              {trip.passengers
                .filter((p) => p.checkedIn)
                .map((p) => (
                  <View key={p.id} style={s.allDoneRow}>
                    <View style={s.allDoneCheck}>
                      <Feather name="check" size={13} color={palette.successDark} />
                    </View>
                    <Text variant="bodySmall" style={{ flex: 1 }}>
                      {p.name}
                    </Text>
                    <Text variant="caption" color="textTertiary">
                      {p.seat ? `Seat ${p.seat}` : 'Seat at gate'}
                      {p.boardingSequence ? ` · seq ${p.boardingSequence}` : ''}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}

        {step === 'select' && !allDone && (
          <>
            {needsDocs && (
              <View style={[s.note, { backgroundColor: palette.infoLight }]}>
                <Feather name="globe" size={13} color={palette.infoDark} />
                <Text variant="caption" style={{ color: palette.infoDark, flex: 1 }}>
                  This is an international flight. Passport details are required for
                  each traveller before a boarding pass can be issued, and online
                  check-in closes 4 hours before departure.
                </Text>
              </View>
            )}

            <Text variant="caption" color="textTertiary" style={s.label}>
              WHO IS CHECKING IN
            </Text>

            {eligible.map((p) => {
              const on = selected.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  style={[s.row, on && s.rowOn]}
                  onPress={() => toggle(p.id)}
                >
                  <View style={[s.box, on && s.boxOn]}>
                    {on && <Feather name="check" size={14} color={palette.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{p.name}</Text>
                    <Text variant="caption" color="textTertiary">
                      {p.seat ? `Seat ${p.seat}` : 'No seat yet'}
                      {p.meal ? ` · ${p.meal}` : ''}
                    </Text>
                    {needsDocs && docs[p.id] && docs[p.id].passportNumber && (
                      <Text variant="caption" style={{ color: palette.success, marginTop: 2 }}>
                        Passport {docs[p.id].passportNumber} · {docs[p.id].nationality}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {trip.passengers.some((p) => p.type === 'infant') && (
              <View style={s.note}>
                <Feather name="info" size={13} color={palette.gray600} />
                <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                  Infants travel on a lap and are added to the accompanying adult's
                  boarding pass.
                </Text>
              </View>
            )}

            {noSeat.length > 0 && (
              <View style={[s.note, { backgroundColor: palette.warningLight }]}>
                <Feather name="alert-circle" size={13} color={palette.warningDark} />
                <Text variant="caption" style={{ color: palette.warningDark, flex: 1 }}>
                  {noSeat.length === 1 ? 'One traveller has' : `${noSeat.length} travellers have`}{' '}
                  no seat yet. The airline will assign one, which may not be beside
                  the rest of your party.
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Passport ── */}
        {step === 'documents' && currentDoc && currentId && (
          <>
            <View style={s.docHead}>
              <View style={s.docMark}>
                <Text variant="caption" style={{ color: palette.gray700, fontWeight: '700' }}>
                  {trip.passengers.find((p) => p.id === currentId)?.name.charAt(0)}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyMedium">
                  {trip.passengers.find((p) => p.id === currentId)?.name}
                </Text>
                <Text variant="caption" color="textTertiary">
                  Details must match the passport you will carry
                </Text>
              </View>
              {allDocsValid && (
                <Feather name="check-circle" size={18} color={palette.success} />
              )}
            </View>

            <Field
              label="Passport number"
              error={docTouched ? docErrors.passportNumber : undefined}
            >
              <TextInput
                style={[
                  s.input,
                  docTouched && docErrors.passportNumber && s.inputError,
                ]}
                value={currentDoc.passportNumber}
                onChangeText={(v) => setDocField('passportNumber', v.toUpperCase())}
                placeholder="e.g. M1234567"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={12}
              />
            </Field>

            <Field label="Nationality" error={docTouched ? docErrors.nationality : undefined}>
              <Pressable style={[s.input, s.picker]} onPress={() => setShowNat(true)}>
                <Text variant="body" style={{ flex: 1 }}>
                  {currentDoc.nationality}
                </Text>
                <Feather name="chevron-down" size={18} color={palette.gray500} />
              </Pressable>
            </Field>

            <Field label="Passport expiry" error={docTouched ? docErrors.expiry : undefined}>
              <TextInput
                style={[s.input, docTouched && docErrors.expiry && s.inputError]}
                value={currentDoc.expiry}
                onChangeText={(v) => setDocField('expiry', maskDate(v, currentDoc.expiry))}
                placeholder="DD/MM/YYYY"
                placeholderTextColor={palette.gray400}
                selectionColor={palette.primary500}
                keyboardType="number-pad"
                maxLength={10}
              />
            </Field>

            <View style={s.note}>
              <Feather name="info" size={13} color={palette.gray600} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                Most destinations require a passport valid for six months beyond
                your travel date. Airlines pass these details to border authorities
                before departure.
              </Text>
            </View>
          </>
        )}

        {/* ── Declaration ── */}
        {step === 'declare' && (
          <>
            <View style={s.declareBlock}>
              <Text variant="bodySmall" color="textSecondary">
                Before a boarding pass can be issued, check what you may and may
                not carry, then confirm on behalf of your party.
              </Text>
            </View>

            {/* Dangerous goods guide */}
            {dangerousGoods.map((group) => {
              const tone =
                group.tone === 'bad'
                  ? { ring: palette.error, bg: palette.errorLight, fg: palette.errorDark }
                  : group.tone === 'caution'
                    ? { ring: palette.warning, bg: palette.warningLight, fg: palette.warningDark }
                    : { ring: palette.info, bg: palette.infoLight, fg: palette.infoDark };

              return (
                <View key={group.key} style={s.dgGroup}>
                  <View style={s.dgGroupHead}>
                    <View style={[s.dgGroupMark, { backgroundColor: tone.bg }]}>
                      <Feather
                        name={
                          group.key === 'banned'
                            ? 'slash'
                            : group.key === 'cabinOnly'
                              ? 'briefcase'
                              : 'archive'
                        }
                        size={14}
                        color={tone.fg}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyMedium">{group.title}</Text>
                      <Text variant="caption" color="textTertiary">
                        {group.subtitle}
                      </Text>
                    </View>
                  </View>

                  <View style={s.dgGrid}>
                    {group.items.map((item) => (
                      <View key={item.name} style={s.dgTile}>
                        <View style={[s.dgSymbol, { borderColor: tone.ring }]}>
                          <Feather name={item.icon as never} size={22} color={palette.gray900} />
                          {group.key === 'banned' && (
                            <View style={[s.dgSlash, { backgroundColor: tone.ring }]} />
                          )}
                        </View>
                        <Text variant="caption" align="center" numberOfLines={2} style={s.dgTileLabel}>
                          {item.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            {/* Confirmations */}
            <Text variant="caption" color="textTertiary" style={s.dgConfirmLabel}>
              I CONFIRM THAT
            </Text>
            {[
              'Nothing on the "never allowed" list is in any of our bags',
              'Batteries, power banks and vapes are in cabin baggage only',
              'Names on the booking match the photo ID each traveller carries',
              ...(needsDocs
                ? ['Everyone holds any visa the destination requires']
                : []),
            ].map((line) => (
              <View key={line} style={s.bullet}>
                <View style={s.bulletDot} />
                <Text variant="bodySmall" style={{ flex: 1 }}>
                  {line}
                </Text>
              </View>
            ))}

            <Pressable
              style={[s.declare, declared && s.declareOn]}
              onPress={() => setDeclared((v) => !v)}
            >
              <View style={[s.box, declared && s.boxOn]}>
                {declared && <Feather name="check" size={14} color={palette.white} />}
              </View>
              <Text variant="bodySmall" style={{ flex: 1 }}>
                I confirm the above on behalf of everyone in this booking
              </Text>
            </Pressable>
          </>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <View style={s.doneBlock}>
            <View style={s.doneIcon}>
              <Feather name="check" size={26} color={palette.white} />
            </View>
            <Text variant="bodySmall" color="textSecondary" align="center">
              {selected.length} boarding pass{selected.length > 1 ? 'es' : ''} issued.
              You can open them from your itinerary at any time.
            </Text>
            <View style={s.doneHint}>
              <Feather name="wifi-off" size={13} color={palette.gray600} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                Save them to your device now — airport connectivity is unreliable.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      </Sheet>

      <PickerSheet
        visible={showNat}
        title="Nationality"
        options={NATIONALITIES}
        selected={currentDoc?.nationality ?? ''}
        searchable
        onClose={() => setShowNat(false)}
        onSelect={(v) => {
          if (currentId) {
            setDocs((d) => ({
              ...d,
              [currentId]: { ...docFor(currentId), nationality: v },
            }));
            setDocTouched(true);
          }
        }}
      />
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={s.field}>
      <Text variant="caption" color="textSecondary" style={{ marginBottom: 7 }}>
        {label}
      </Text>
      {children}
      {error && (
        <View style={s.errorRow}>
          <Feather name="alert-circle" size={12} color={palette.error} />
          <Text variant="caption" style={{ color: palette.error }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// Undo check-in
// ═══════════════════════════════════════════════════════════

export function UndoCheckInSheet({
  visible,
  trip,
  now,
  onClose,
  onUndo,
}: {
  visible: boolean;
  trip: Trip;
  now: number;
  onClose: () => void;
  onUndo: (passengerIds: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const checkedIn = useMemo(
    () => trip.passengers.filter((p) => p.checkedIn),
    [trip.passengers],
  );

  useEffect(() => {
    if (visible) setSelected(checkedIn.map((p) => p.id));
  }, [visible, checkedIn]);

  const rule = canUndoCheckIn(trip, now);
  const seg = trip.segments[0];

  const toggle = (id: string) =>
    setSelected((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Cancel check-in"
      subtitle={`${seg.marketingFlight} · ${dateOf(seg.departISO)}`}
      heightRatio={0.7}
      footer={
        rule.allowed ? (
          <Pressable
            style={[s.danger, selected.length === 0 && s.ctaOff]}
            onPress={() => selected.length > 0 && onUndo(selected)}
            disabled={selected.length === 0}
          >
            <Text variant="bodyMedium" style={{ color: palette.white, fontWeight: '600' }}>
              {selected.length === 0
                ? 'Select a traveller'
                : `Cancel check-in for ${selected.length}`}
            </Text>
          </Pressable>
        ) : (
          <Pressable style={s.ghostWide} onPress={onClose}>
            <Text variant="bodyMedium" color="textSecondary">
              Close
            </Text>
          </Pressable>
        )
      }
    >
      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
        {!rule.allowed ? (
          <View style={[s.note, { backgroundColor: palette.warningLight }]}>
            <Feather name="lock" size={14} color={palette.warningDark} />
            <View style={{ flex: 1 }}>
              <Text variant="bodySmall" style={{ color: palette.warningDark, fontWeight: '600' }}>
                Cannot be cancelled online
              </Text>
              <Text variant="caption" style={{ color: palette.warningDark }}>
                {rule.reason}. The airline desk at the airport can still help.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View style={[s.note, { backgroundColor: palette.warningLight }]}>
              <Feather name="alert-triangle" size={14} color={palette.warningDark} />
              <View style={{ flex: 1 }}>
                <Text variant="bodySmall" style={{ color: palette.warningDark, fontWeight: '600' }}>
                  Seats are released
                </Text>
                <Text variant="caption" style={{ color: palette.warningDark }}>
                  Checking in again may not return the same seats, and travellers in
                  the same booking may end up apart.
                </Text>
              </View>
            </View>

            <Text variant="caption" color="textTertiary" style={s.label}>
              WHO TO CANCEL
            </Text>

            {checkedIn.map((p) => {
              const on = selected.includes(p.id);
              return (
                <Pressable
                  key={p.id}
                  style={[s.row, on && s.rowDanger]}
                  onPress={() => toggle(p.id)}
                >
                  <View style={[s.box, on && s.boxDanger]}>
                    {on && <Feather name="check" size={14} color={palette.white} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium">{p.name}</Text>
                    <Text variant="caption" color="textTertiary">
                      Seat {p.seat} · sequence {p.boardingSequence}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <View style={s.note}>
              <Feather name="clock" size={13} color={palette.gray600} />
              <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
                You can check in again until online check-in closes,{' '}
                {seg.international ? 4 : 2} hours before departure.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}


// ═══════════════════════════════════════════════════════════
// Boarding pass
// ═══════════════════════════════════════════════════════════

export function BoardingPassSheet({
  visible,
  trip,
  onClose,
}: {
  visible: boolean;
  trip: Trip;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const passes = trip.passengers.filter((p) => p.checkedIn);
  const seg = trip.segments[0];

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  const p: TripPassenger | undefined = passes[index];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Boarding pass"
      subtitle={
        passes.length > 1
          ? `${index + 1} of ${passes.length} · swipe the tabs to switch`
          : seg.marketingFlight
      }
      heightRatio={0.9}
      headerAccessory={
        passes.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tabs}
          >
            {passes.map((pp, i) => (
              <Pressable
                key={pp.id}
                style={[s.tab, i === index && s.tabOn]}
                onPress={() => setIndex(i)}
              >
                <Text
                  variant="caption"
                  style={{
                    color: i === index ? palette.white : palette.gray700,
                    fontWeight: i === index ? '600' : '400',
                  }}
                >
                  {pp.name.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null
      }
    >
      <ScrollView contentContainerStyle={s.passBody} showsVerticalScrollIndicator={false}>
        {p && (
          <View style={s.pass}>
            {/* Header */}
            <View style={[s.passTop, { backgroundColor: seg.carrierColor }]}>
              <View>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {seg.marketingCarrier}
                </Text>
                <Text style={s.passFlight}>{seg.marketingFlight}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {seg.cabin}
                </Text>
                <Text variant="bodyMedium" style={{ color: palette.white }}>
                  {dateOf(seg.departISO)}
                </Text>
              </View>
            </View>

            {/* Route */}
            <View style={s.passRoute}>
              <View>
                <Text style={s.passCode}>{seg.origin}</Text>
                <Text variant="caption" color="textTertiary">
                  {seg.originCity}
                </Text>
              </View>
              <Plane size={18} color={palette.gray400} />
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.passCode}>{seg.destination}</Text>
                <Text variant="caption" color="textTertiary">
                  {seg.destinationCity}
                </Text>
              </View>
            </View>

            {/* Detail grid */}
            <View style={s.passGrid}>
              <PassField label="Passenger" value={p.name} wide />
              <PassField label="Seat" value={p.seat ?? 'At gate'} />
              <PassField label="Boarding" value={timeOf(seg.departISO)} />
              <PassField label="Terminal" value={seg.originTerminal} />
              <PassField label="Gate" value={seg.gate ?? 'TBA'} />
              <PassField
                label="Sequence"
                value={p.boardingSequence ? `${p.boardingSequence}` : '—'}
              />
              <PassField label="PNR" value={trip.pnr} />
            </View>

            {/* Perforation */}
            <View style={s.perforation}>
              <View style={[s.notch, { left: -10 }]} />
              <View style={s.dashes} />
              <View style={[s.notch, { right: -10 }]} />
            </View>

            {/* Barcode */}
            <View style={s.passFoot}>
              <Barcode seed={`${trip.pnr}${p.id}${p.seat ?? ''}`} />
              <Text variant="caption" color="textTertiary" align="center">
                {trip.pnr} · {seg.marketingFlight} · {p.seat ?? 'OPEN'}
              </Text>
            </View>
          </View>
        )}

        <View style={s.passActions}>
          <Pressable style={s.passAction}>
            <Feather name="download" size={17} color={palette.gray900} />
            <Text variant="bodySmall">Save to device</Text>
          </Pressable>
          <Pressable style={s.passAction}>
            <Feather name="smartphone" size={17} color={palette.gray900} />
            <Text variant="bodySmall">Add to wallet</Text>
          </Pressable>
        </View>

        {seg.gate === null && (
          <View style={s.note}>
            <Feather name="info" size={13} color={palette.gray600} />
            <Text variant="caption" color="textSecondary" style={{ flex: 1 }}>
              Gates are usually published about 90 minutes before departure. Check
              the airport screens on the day.
            </Text>
          </View>
        )}
      </ScrollView>
    </Sheet>
  );
}

function PassField({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View style={[s.passField, wide && { width: '100%' }]}>
      <Text variant="caption" color="textTertiary">
        {label}
      </Text>
      <Text variant="bodyMedium" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const s = StyleSheet.create({
  body: { paddingHorizontal: HPAD, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  label: { letterSpacing: 1, marginBottom: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 68,
  },
  rowOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },
  box: {
    width: 24,
    height: 24,
    borderRadius: radii.xs,
    borderWidth: 2,
    borderColor: palette.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: palette.primary500, borderColor: palette.primary500 },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },

  allDone: { alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm },
  allDoneIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  allDoneList: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  allDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.gray100,
  },
  allDoneCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: palette.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  declareBlock: { marginBottom: spacing.md },

  dgGroup: { marginBottom: spacing.lg },
  dgGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dgGroupMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dgGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dgTile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: 2,
    gap: 6,
  },
  dgSymbol: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  dgSlash: {
    position: 'absolute',
    width: 60,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: '-45deg' }],
  },
  dgTileLabel: { lineHeight: 15 },
  dgConfirmLabel: {
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 7,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.gray400,
    marginTop: 7,
  },
  declare: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
    minHeight: 68,
  },
  declareOn: { borderColor: palette.primary500, backgroundColor: palette.primary50 },

  doneBlock: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg },
  doneIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.gray50,
    padding: spacing.md,
    borderRadius: radii.sm,
    marginTop: spacing.sm,
  },

  picker: { flexDirection: 'row', alignItems: 'center' },
  field: { marginBottom: spacing.lg },
  input: {
    fontSize: 16,
    lineHeight: 24,
    color: palette.gray900,
    minHeight: 52,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: palette.white,
  },
  inputError: { borderColor: palette.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },

  docHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  docMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowDanger: { borderColor: palette.error, backgroundColor: palette.errorLight },
  boxDanger: { backgroundColor: palette.error, borderColor: palette.error },
  danger: {
    minHeight: 52,
    backgroundColor: palette.error,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ghost: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostWide: {
    minHeight: 52,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: palette.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cta: {
    flexDirection: 'row',
    minHeight: 52,
    backgroundColor: palette.primary500,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaOff: { backgroundColor: palette.gray400 },

  // Boarding pass
  tabs: { flexDirection: 'row', gap: 6, paddingHorizontal: HPAD, paddingTop: spacing.md },
  tab: {
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: palette.gray900, borderColor: palette.gray900 },

  passBody: { paddingHorizontal: HPAD, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  pass: {
    backgroundColor: palette.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.gray200,
    overflow: 'hidden',
  },
  passTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
  },
  passFlight: { fontSize: 20, fontWeight: '700', color: palette.white, lineHeight: 25 },
  passRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  passCode: { fontSize: 30, fontWeight: '700', color: palette.gray900, lineHeight: 35 },
  passGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  passField: { width: '50%', paddingVertical: 7 },

  perforation: { flexDirection: 'row', alignItems: 'center', height: 20 },
  notch: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.gray50,
  },
  dashes: {
    flex: 1,
    marginHorizontal: spacing.md,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.gray300,
  },

  passFoot: { alignItems: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: spacing.sm },
  barcode: { flexDirection: 'row', alignItems: 'center', height: 44 },

  passActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  passAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.gray200,
    borderRadius: radii.md,
    minHeight: 52,
  },
});
