import Tebex from '@tebexio/tebex.js';

const COLORS = [
  { name: 'primary' as const, color: '#FF9500' },
  { name: 'secondary' as const, color: '#FF3B30' },
];

export function launchTebexCheckout(ident: string) {
  Tebex.checkout.init({ ident, theme: 'dark', colors: COLORS });
  Tebex.checkout.launch();
}
