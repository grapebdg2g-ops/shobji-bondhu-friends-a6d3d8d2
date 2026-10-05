import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIVE_INGREDIENTS, BIO_PESTICIDES, checkResistance, getChemicalInfo, getPhiDays, getBioOptions, findCrop, getIrrigationAdvice, getIpmRules } from './crop-knowledge';

describe('crop knowledge', () => {
  it('maps Vertimec to abamectin IRAC 6 with 7-day PHI', () => {
    const a = getChemicalInfo('এবামেক্টিন ১.৮ ইসি (ভার্টিম্যাক — সিনজেন্টা)')!;
    assert.equal(a.system, 'IRAC');
    assert.equal(a.group, '6');
    assert.equal(a.phiDays, 7);
  });

  it('combined product uses the longest PHI', () => {
    assert.equal(getPhiDays('দামার (ফিপ্রোনিল ৪০% + থায়ামেথক্সাম ২০%)'), 14);
  });

  it('warns on same IRAC group used twice in a row', () => {
    const w = checkResistance(['ইমিডাক্লোপ্রিড', 'থায়ামেথক্সাম']);
    assert.equal(w[0].groupKey, 'IRAC-4A');
  });

  it('does not warn for rotated groups or multi-site fungicides', () => {
    assert.deepEqual(checkResistance(['ইমিডাক্লোপ্রিড', 'এবামেক্টিন', 'থায়ামেথক্সাম']), []);
    assert.deepEqual(checkResistance(['ম্যানকোজেব', 'ম্যানকোজেব']), []);
  });

  it('rice uses AWD irrigation', () => {
    const rice = findCrop('বোরো ধান')!;
    assert.ok(getIrrigationAdvice(rice, rice.stages[0]).method.includes('AWD'));
  });

  it('fruit fly rule applies to watermelon but not rice', () => {
    assert.equal(getIpmRules(findCrop('তরমুজ')!).some((r) => r.id === 'fruitfly'), true);
    assert.equal(getIpmRules(findCrop('বোরো ধান')!).some((r) => r.id === 'fruitfly'), false);
  });

  it('every active ingredient has an organic alternative', () => {
    for (const a of ACTIVE_INGREDIENTS) {
      assert.ok(a.organic.length > 10, a.id);
    }
  });

  it('matches bio-pesticides by pest/disease keywords', () => {
    const borers = getBioOptions('টমেটোতে ফল ছিদ্রকারী পোকা দেখা দিয়েছে');
    assert.ok(borers.some((b) => b.id === 'bt'), 'bt should match fruit borer');
    const wilt = getBioOptions('গাছ ঢলে পড়া রোগ');
    assert.ok(wilt.some((b) => b.id === 'trichoderma'), 'trichoderma should match wilt');
  });

  it('every bio-pesticide has dose, method and note', () => {
    for (const b of BIO_PESTICIDES) {
      assert.ok(b.dose.length > 3 && b.method.length > 3 && b.note.length > 3, b.id);
      assert.ok(b.targets.length >= 2, b.id);
    }
  });
});
