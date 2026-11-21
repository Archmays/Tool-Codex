import assert from 'node:assert/strict';
import test from 'node:test';
import { exhibits } from '../games/structure-explorer/data/exhibits.ts';
import { materialIds, materials } from '../games/structure-explorer/data/materials.ts';
import { pencilParts } from '../games/structure-explorer/data/pencil-parts.ts';

test('all seven materials have complete, ordered provenance and reciprocal exhibit references', () => {
  assert.deepEqual(Object.keys(materials), materialIds);
  assert.equal(materialIds.length, 7);
  assert.deepEqual(exhibits.map(exhibit => exhibit.id), ['pencil']);
  for (const exhibit of exhibits) {
    assert.equal(new Set(exhibit.materialIds).size, exhibit.materialIds.length);
    for (const id of exhibit.materialIds) assert.ok(materials[id].usedInExhibits.includes(exhibit.id));
  }
  for (const [id, material] of Object.entries(materials)) {
    assert.equal(material.id, id);
    assert.ok(material.usedInExhibits.length);
    for (const exhibit of material.usedInExhibits) {
      assert.ok(exhibits.find(item => item.id === exhibit)?.materialIds.includes(id));
    }
    assert.equal(material.originSteps.length, 4);
    assert.deepEqual(material.originSteps.map(step => step.stage), ['原料', '准备', '加工', '成形']);
    assert.ok(material.traits.length >= 2 && material.traits.length <= 3);
    assert.match(material.swatchColor, /^#[a-f0-9]{6}$/);
  }
});

test('all seven part selections plus the whole pencil use registered materials', () => {
  assert.deepEqual(Object.keys(pencilParts), [
    'all', 'wood-upper', 'wood-lower', 'core', 'paint-upper', 'paint-lower', 'seam', 'tip',
  ]);
  for (const part of Object.values(pencilParts)) {
    assert.ok(part.materialIds.length);
    for (const id of part.materialIds) assert.ok(exhibits[0].materialIds.includes(id));
  }
});

test('learning data fields are populated and contain no identifying record fields or formats', () => {
  function check(value) {
    if (typeof value === 'string') {
      assert.ok(value.trim());
      assert.doesNotMatch(value, /身份证|出生日期|真实姓名|学校名称|\d{4}-\d{2}-\d{2}|\b1[3-9]\d{9}\b|[\w.-]+@[\w.-]+\.[a-z]{2,}/iu);
      return;
    }
    assert.ok(value && Object.values(value).length);
    Object.values(value).forEach(check);
  }
  [materials, exhibits, pencilParts].forEach(check);
});
