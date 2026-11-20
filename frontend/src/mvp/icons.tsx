const paths = {
  home: 'M2 10 12 2l10 8M5 9v12h5v-6h4v6h5V9',
  compass: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16 8l-2 6-6 2 2-6 6-2z',
  route: 'M5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm14 13a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 8v7a3 3 0 0 0 3 3h8m3-5V9a3 3 0 0 0-3-3h-4',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  close: 'm6 6 12 12M18 6 6 18',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  back: 'M20 12H5m6 6-6-6 6-6',
  pin: 'M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0zm-8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4m8-4v4',
  star: 'm12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z',
  check: 'm4 12 5 5L20 6',
  lock: 'M6 10h12v11H6zM8 10V7a4 4 0 1 1 8 0v3m-4 5v2',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  chevron: 'm9 6 6 6-6 6',
  globe: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM2 12h20M12 2c-5 5-5 15 0 20m0-20c5 5 5 15 0 20',
  image: 'M3 4h18v16H3zM3 17l6-6 5 5 3-3 4 4M16 8h.02',
  spark: 'M12 2c0 6 4 10 10 10-6 0-10 4-10 10 0-6-4-10-10-10 6 0 10-4 10-10z',
  eye: 'M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  map: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v15',
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function Gem({ small = false, done = false }: { small?: boolean; done?: boolean }) {
  return <svg className="gem" viewBox="0 0 24 32" width={small ? 18 : 30} height={small ? 24 : 40} aria-hidden="true">
    <path fill="#19372a" d="M12 0 24 9v15l-12 8L0 24V9z"/>
    <path fill={done ? '#e4a43b' : '#31ae60'} d="m12 3 9 7v12l-9 7-9-7V10z"/>
    <path fill={done ? '#ffed9e' : '#dfffb4'} d="m12 3 4 9-4 3-4-3zm-9 7 5 2v12l-5-2z"/>
    <path fill={done ? '#b96b1f' : '#16763f'} d="m21 10-5 2v12l5-2zm-9 5v14l-4-5V12z"/>
  </svg>;
}
