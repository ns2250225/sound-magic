'use strict';
// 像素精灵：字符画 → 离屏画布
const PAL = {
  k: '#1a1026', // 描边
  h: '#4b2a8c', H: '#7a4fd0', b: '#f2c14e',          // 法师帽
  s: '#f1c7a0', S: '#c98f6b', e: '#1a1026',          // 皮肤 / 眼睛
  w: '#ecebf5', W: '#aeb0c8',                        // 胡子
  r: '#2f4fa8', R: '#4f7ae0', d: '#1f2f6a', g: '#f2c14e', // 法袍
  o: '#5a3b24',                                      // 靴子
  y: '#e0b050', Y: '#a8742a',                        // 稻草
  c: '#d8c096', C: '#a48a64',                        // 麻袋头
  p: '#c0413b', P: '#7e2424',                        // 格子衬衫
  t: '#6b4a2b', T: '#43301c',                        // 木桩
};

// 面朝右的魔法师，手在 (18~19, 20~21)
const MAGE_ART = [
  '...........kk.........',
  '..........kHk.........',
  '..........khHk........',
  '.........khhHk........',
  '.........khhHk........',
  '........khhhHHk.......',
  '........khhhhHk.......',
  '.......khhbhhHHk......',
  '.......khhhhhhHk......',
  '......khhhhhhhHHk.....',
  '....kkbbbbbbbbbbbbkk..',
  '...khhhhhhhhhhhhhhhhk.',
  '....kkkkkkkkkkkkkkkk..',
  '........kSsssssk......',
  '........kSsssesk......',
  '........kSssssssk.....',
  '........kwwsswwk......',
  '.......kwwwwwwwwk.....',
  '......kdkwWwwwWwkk....',
  '.....kdrrkwwwwwkRRk...',
  '.....kdrrrkwwWkRRRsk..',
  '.....kdrrrgkwkgRRssk..',
  '.....kdrrrrgggrRRkk...',
  '....kddrrrrrgrrRRRk...',
  '....kddrrrrrgrrRRRk...',
  '....kddrrrrrgrrRRRRk..',
  '...kdddrrrrrgrrrRRRk..',
  '...kdddrrrrrgrrrRRRRk.',
  '...kggggggggggggggggk.',
  '....kkkookkkkkookkkk..',
  '.......kook...kook....',
];

// 稻草人，中心列 12，最后一行为地面
const CROW_ART = [
  '..........kkkkk..........',
  '.........kyyyyyk.........',
  '.........kyYyyyk.........',
  '........kyyyyyyyk........',
  '.......kPPPPPPPPPk.......',
  '....kkkyyyyyyyyyyykkk....',
  '..kkYYYYYYYYYYYYYYYYYkk..',
  '...kkkkkkkkkkkkkkkkkkk...',
  '.......kcccccccccck......',
  '.......kckkcccckkck......',
  '.......kckkcccckkck......',
  '.......kcccccccccck......',
  '.......kcckckckcck.......',
  '.......kCcccccccCk.......',
  '........kCCCCCCCk........',
  '.........kyyYyyk.........',
  '..kkkkkkkkkkkkkkkkkkkkk..',
  'yykpPpppPpppppppPpppPpkyy',
  'yykpPpppPpppppppPpppPpkyy',
  '.ykkkkkkkppPpppPppkkkkky.',
  '.......kpPPpppPPpk.......',
  '.......kppppPppppk.......',
  '.......kpppcCcpppk.......',
  '.......kyykyyykyyk.......',
  '........ky.kyk.yk........',
  '...........ktk...........',
  '...........ktk...........',
  '...........ktk...........',
  '...........ktk...........',
  '...........kTk...........',
  '...........ktk...........',
  '...........ktk...........',
  '...........ktk...........',
  '...........kTk...........',
  '...........ktk...........',
  '..........kTtTk..........',
  '.........kkkkkkk.........',
];

function makeSprite(rows) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d');
  rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const col = PAL[row[i]];
      if (!col) continue;
      x.fillStyle = col; x.fillRect(i, j, 1, 1);
    }
  });
  return c;
}
function tintSprite(src, color) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function findChar(rows, ch) {
  for (let y = 0; y < rows.length; y++) { const x = rows[y].indexOf(ch); if (x >= 0) return { x, y }; }
  return { x: 0, y: 0 };
}

const SPR = {};
(function buildSprites() {
  SPR.mage = makeSprite(MAGE_ART);
  SPR.mageEye = findChar(MAGE_ART, 'e');
  SPR.crow = makeSprite(CROW_ART);
  SPR.crowTint = {
    white: tintSprite(SPR.crow, '#ffffff'),
    ice: tintSprite(SPR.crow, '#9ee6ff'),
    fire: tintSprite(SPR.crow, '#ff6a1a'),
    elec: tintSprite(SPR.crow, '#aefaff'),
    void: tintSprite(SPR.crow, '#8a3bff'),
  };
})();
