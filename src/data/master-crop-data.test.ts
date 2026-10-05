import { describe, expect, test } from 'bun:test';
import { getAllCrops, getCrop } from './master-crop-data';
import { FARMING_STAGES } from './farming-guide';
import { AI_CROP_LABELS, CALCULATOR_CROP_OPTIONS, COMMUNITY_CROP_LABELS, PROFILE_CROP_LABELS } from '../lib/crop-options';

describe('Papaya availability', () => {
  test('master catalog includes selectable papaya with a complete growing cycle', () => {
    const crop = getCrop('papaya');
    expect(crop?.name).toBe('পেঁপে');
    expect(getAllCrops().filter(c => c.id === 'papaya')).toHaveLength(1);
    expect(crop?.stages.at(-1)?.endDay).toBe(crop?.totalDays);
    expect(crop?.stages.length).toBeGreaterThan(0);
  });
  test('papaya propagates to advice, AI, community and profile selectors', () => {
    expect(FARMING_STAGES['পেঁপে']?.totalDays).toBe(365);
    for (const labels of [AI_CROP_LABELS, COMMUNITY_CROP_LABELS, PROFILE_CROP_LABELS]) {
      expect(labels).toContain('পেঁপে');
    }
  });
  test('papaya is available as a preliminary calculator crop', () => {
    const crop = CALCULATOR_CROP_OPTIONS.find(c => c.id === 'papaya');
    expect(crop?.label).toBe('পেঁপে');
    expect(crop?.calculatorId).toBeNull();
  });
});