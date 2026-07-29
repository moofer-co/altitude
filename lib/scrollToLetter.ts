import type { RefObject } from 'react';
import type { SectionList } from 'react-native';
import type { Airport } from '../types';

type AirportSection = { title: string; data: readonly Airport[] };

/**
 * Scroll a Z→A airport SectionList to the first row of a letter section.
 * SectionList often fails the first attempt before cells are measured — retry.
 */
export function scrollAirportListToLetter(
  listRef: RefObject<SectionList<Airport> | null>,
  sections: readonly AirportSection[],
  letter: string,
) {
  const sectionIndex = sections.findIndex((s) => s.title === letter);
  if (sectionIndex < 0) return;

  const run = () => {
    try {
      listRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        viewOffset: 8,
        animated: false,
      });
    } catch {
      // Some RN versions throw when the frame is not ready yet
    }
  };

  run();
  requestAnimationFrame(run);
  setTimeout(run, 64);
  setTimeout(run, 180);
}
