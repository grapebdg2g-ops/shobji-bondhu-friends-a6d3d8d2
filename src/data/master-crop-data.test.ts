import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { getAllCrops, getCrop } from './master-crop-data';
import { FARMING_STAGES } from './farming-guide';
import { AI_CROP_LABELS, CALCULATOR_CROP_OPTIONS, COMMUNITY_CROP_LABELS, PROFILE_CROP_LABELS } from '../lib/crop-options';

describe('Papaya availability', () => {
  test('master catalog includes selectable papaya with a complete growing cycle', () => {
    const crop = getCrop('papaya');
    assert.equal(crop?.name, 'পেঁপে');
    assert.equal(getAllCrops().filter(c => c.id === 'papaya').length, 1);
    assert.ok(crop);
    assert.equal(crop.stages.at(-1)?.endDay, crop.totalDays);
    assert.ok(crop.stages.length > 0);
  });
  test('papaya propagates to advice, AI, community and profile selectors', () => {
    assert.equal(FARMING_STAGES['পেঁপে']?.totalDays, 365);
    for (const labels of [AI_CROP_LABELS, COMMUNITY_CROP_LABELS, PROFILE_CROP_LABELS]) {
      assert.ok(labels.includes('পেঁপে'));
    }
  });
  test('papaya is available as a preliminary calculator crop', () => {
    const crop = CALCULATOR_CROP_OPTIONS.find(c => c.id === 'papaya');
    assert.equal(crop?.label, 'পেঁপে');
    assert.equal(crop?.calculatorId, null);
  });
});