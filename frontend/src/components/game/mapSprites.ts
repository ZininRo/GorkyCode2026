const palette: Record<string, string> = {
  '#': '#302839', g: '#278052', G: '#67d893', y: '#c17834', Y: '#ffdc73',
  w: '#fff4cb', b: '#34768a', B: '#79e1d2', p: '#684e76', P: '#b598bd',
  a: '#428dda', t: '#6c935a', T: '#7ea364',
};

// Original 12 × 12 sprites. Each character represents one square in the palette.
const crystal = [
  '     ##     ', '    #wY#    ', '   #wYYY#   ', '  #wYYYYY#  ',
  ' #YYYYYYYy# ', '#YYYYYYYyy# ', '#YYYYYYyyy# ', ' #YYYYyyy#  ',
  '  #YYyyy#   ', '   #yyy#    ', '    #y#     ', '     #      ',
];
const sprites: Record<string, string[]> = {
  yellow: crystal,
  green: crystal.map(row => row.replaceAll('Y', 'G').replaceAll('y', 'g')),
  completed: [
    '   ######   ', '  #BBBBBB#  ', ' #BBBBBBBB# ', '#BBBBBBBBbb#',
    '#BBBBBBBwbb#', '#BBwBBBwwbb#', '#BBwwBwwbbb#', '#BBBwwwbbbb#',
    '#BBBbwbbbbb#', ' #bbbbbbbb# ', '  #bbbbbb#  ', '   ######   ',
  ],
  locked: [
    '    ####    ', '   #PPPP#   ', '  #P####P#  ', '  #P#  #P#  ',
    ' ########## ', ' #PPPPPPp#  ', ' #PP##Ppp#  ', ' #PP##ppp#  ',
    ' #PPP#ppp#  ', ' #PPppppp#  ', ' #########  ', '            ',
  ],
  'park-pattern': [
    'TTTTTTTTTTTT', 'TTTTtTTTTTTT', 'TTTtttTTTTTT', 'TTTTtTTTTTTT',
    'TTTTTTTTTTTT', 'TTTTTTTTTTTT', 'TTTTTTTTTTTT', 'TTTTTTTTTtTT',
    'TTTTTTTTTTTT', 'TTtTTTTTTTTT', 'TTTTTTTTTTTT', 'TTTTTTTTTTTT',
  ],
  player: [
    '    ####    ', '   #wwww#   ', '  #waaaaw#  ', ' #waaaaaaw# ',
    '#waaa##aaaw#', '#waaa##aaaw#', '#waaa##aaaw#', '#waaaaaaaaw#',
    ' #waaaaaaw# ', '  #waaaaw#  ', '   #wwww#   ', '    ####    ',
  ],
};

export function createMapSprites() {
  return Object.entries(sprites).map(([name, rows]) => {
    const canvas = document.createElement('canvas');
    const pattern = name === 'park-pattern';
    canvas.width = canvas.height = pattern ? 32 : 36;
    const context = canvas.getContext('2d')!;
    const cell = pattern ? 2 : 3;
    if (pattern) {
      context.fillStyle = palette.T;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    rows.forEach((row, y) => {
      [...row].forEach((pixel, x) => {
        if (pixel === ' ') return;
        context.fillStyle = palette[pixel];
        context.fillRect(x * cell, y * cell, cell, cell);
      });
    });
    return [name, context.getImageData(0, 0, canvas.width, canvas.height)] as const;
  });
}
