/* Catálogo de itens: nomes, rótulos curtos, nível (1 ou 2) e ícones vetoriais (SVG). */
(function (GB) {
  'use strict';

  // 1. Dual: dois mísseis vermelhos/dourados voando juntos com badge "2"
  const DUAL_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <g transform="translate(-2, 3) rotate(-35 14 14)">
    <path d="M5 14 L0 16 L5 18 Z" fill="#ff9900"/>
    <path d="M5 10 L1 6 L9 10 Z" fill="#b31217"/>
    <path d="M5 22 L1 26 L9 22 Z" fill="#b31217"/>
    <rect x="5" y="10" width="14" height="12" rx="2" fill="#d92b2b" stroke="#330000" stroke-width="0.8"/>
    <path d="M19 10 L27 16 L19 22 Z" fill="#ffdd33" stroke="#330000" stroke-width="0.8"/>
  </g>
  <g transform="translate(5, -4) rotate(-35 14 14)">
    <path d="M5 14 L0 16 L5 18 Z" fill="#ffbb00"/>
    <path d="M5 10 L1 6 L9 10 Z" fill="#d92b2b"/>
    <path d="M5 22 L1 26 L9 22 Z" fill="#d92b2b"/>
    <rect x="5" y="10" width="14" height="12" rx="2" fill="#ff3838" stroke="#330000" stroke-width="0.8"/>
    <path d="M19 10 L27 16 L19 22 Z" fill="#ffffff" stroke="#330000" stroke-width="0.8"/>
    <rect x="9" y="12" width="6" height="2" fill="#fff" opacity="0.8"/>
  </g>
  <rect x="17" y="18" width="14" height="12" rx="3" fill="#151515" stroke="#ffd700" stroke-width="1.1"/>
  <text x="24" y="27" font-size="9" font-weight="900" font-family="'Lilita One', sans-serif" text-anchor="middle" fill="#ffd700">2</text>
</svg>`;

  // 2. Dual+: míssil duplo elétrico com badge "2+"
  const DUALPLUS_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <g transform="translate(-2, 3) rotate(-35 14 14)">
    <path d="M5 14 L0 16 L5 18 Z" fill="#00e5ff"/>
    <path d="M5 10 L1 6 L9 10 Z" fill="#0077b6"/>
    <path d="M5 22 L1 26 L9 22 Z" fill="#0077b6"/>
    <rect x="5" y="10" width="14" height="12" rx="2" fill="#00b4d8" stroke="#002244" stroke-width="0.8"/>
    <path d="M19 10 L27 16 L19 22 Z" fill="#caf0f8" stroke="#002244" stroke-width="0.8"/>
  </g>
  <g transform="translate(5, -4) rotate(-35 14 14)">
    <path d="M5 14 L0 16 L5 18 Z" fill="#ffbb00"/>
    <path d="M5 10 L1 6 L9 10 Z" fill="#d92b2b"/>
    <path d="M5 22 L1 26 L9 22 Z" fill="#d92b2b"/>
    <rect x="5" y="10" width="14" height="12" rx="2" fill="#ff3838" stroke="#330000" stroke-width="0.8"/>
    <path d="M19 10 L27 16 L19 22 Z" fill="#ffffff" stroke="#330000" stroke-width="0.8"/>
  </g>
  <rect x="14" y="17" width="17" height="13" rx="3" fill="#151515" stroke="#ff4757" stroke-width="1.1"/>
  <text x="22.5" y="27" font-size="8.5" font-weight="900" font-family="'Lilita One', sans-serif" text-anchor="middle" fill="#ff4757">2+</text>
</svg>`;

  // 3. Teleport: anéis de dobra dimensional e raio de salto quântico
  const TELEPORT_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <ellipse cx="16" cy="25" rx="12" ry="5" fill="none" stroke="#00b4d8" stroke-width="1.6" stroke-dasharray="3,2"/>
  <ellipse cx="16" cy="19" rx="9" ry="3.8" fill="none" stroke="#48cae4" stroke-width="1.4"/>
  <ellipse cx="16" cy="13" rx="6" ry="2.6" fill="none" stroke="#90e0ef" stroke-width="1.2"/>
  <path d="M11 25 L13 9 M21 25 L19 9" stroke="#00e5ff" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
  <path d="M16 2 L22 13 L18 13 L18 21 L14 21 L14 13 L10 13 Z" fill="url(#tpGrad)" stroke="#002b4d" stroke-width="1.2" stroke-linejoin="round"/>
  <circle cx="16" cy="7.5" r="1.5" fill="#ffffff"/>
  <defs>
    <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#00e5ff"/>
      <stop offset="100%" stop-color="#0077b6"/>
    </linearGradient>
  </defs>
</svg>`;

  // 4. Cure: kit médico / cruz verde de cura com estrelas restauradoras
  const CURE_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <rect x="4" y="5" width="24" height="22" rx="6" fill="url(#cureGrad)" stroke="#064e3b" stroke-width="1.4"/>
  <rect x="5.5" y="6.5" width="21" height="5" rx="3" fill="#6ee7b7" opacity="0.4"/>
  <path d="M13 9 L19 9 L19 13 L23 13 L23 19 L19 19 L19 23 L13 23 L13 19 L9 19 L9 13 L13 13 Z" fill="#ffffff" stroke="#047857" stroke-width="1.2" stroke-linejoin="round"/>
  <path d="M7 6 L8 4 L9 6 L11 7 L9 8 L8 10 L7 8 L5 7 Z" fill="#ffd700"/>
  <path d="M23 21 L24 19 L25 21 L27 22 L25 23 L24 25 L23 23 L21 22 Z" fill="#ffd700"/>
  <defs>
    <linearGradient id="cureGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="50%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>
</svg>`;

  // 5. Nuclear: bomba amarela com o símbolo de radiação em preto
  const NUCLEAR_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M16 6.5 C16 3.5 18.5 2.2 21 2.6" fill="none" stroke="#6b4a1a" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="21.6" cy="2.6" r="1.8" fill="#ff7a1a"/>
  <circle cx="21.6" cy="2.6" r="0.9" fill="#fff3b0"/>
  <rect x="12.6" y="5.2" width="6.8" height="3.6" rx="1" fill="#6d6d78" stroke="#1e1e26" stroke-width="1"/>
  <circle cx="16" cy="18.5" r="11.2" fill="#ffd400" stroke="#1e1a06" stroke-width="1.3"/>
  <ellipse cx="11.8" cy="13.4" rx="3.2" ry="2" fill="#fff6b0" opacity=".75" transform="rotate(-35 11.8 13.4)"/>
  <g fill="#111">
    <circle cx="16" cy="18.5" r="1.8"/>
    <path d="M17.5 21.1 L20 25.43 A8 8 0 0 1 12 25.43 L14.5 21.1 A3 3 0 0 0 17.5 21.1 Z"/>
    <path d="M13 18.5 L8 18.5 A8 8 0 0 1 12 11.57 L14.5 15.9 A3 3 0 0 0 13 18.5 Z"/>
    <path d="M17.5 15.9 L20 11.57 A8 8 0 0 1 24 18.5 L19 18.5 A3 3 0 0 0 17.5 15.9 Z"/>
  </g>
</svg>`;

  // 6. Napalm: míssil marrom com a ponta triangular branca
  const NAPALM_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <g transform="rotate(-40 16 16)">
    <path d="M6.5 14 L0.5 16 L6.5 18 Z" fill="#ffb347"/>
    <path d="M6.5 14.6 L3 16 L6.5 17.4 Z" fill="#fff3b0"/>
    <path d="M7 11.2 L3.2 6.6 L11.5 11.2 Z" fill="#5a3415" stroke="#2a1606" stroke-width="0.9" stroke-linejoin="round"/>
    <path d="M7 20.8 L3.2 25.4 L11.5 20.8 Z" fill="#5a3415" stroke="#2a1606" stroke-width="0.9" stroke-linejoin="round"/>
    <rect x="6" y="11.2" width="17.5" height="9.6" rx="2.2" fill="#8b5a2b" stroke="#2a1606" stroke-width="1.1"/>
    <rect x="7.5" y="12.4" width="14.5" height="2.2" rx="1.1" fill="#b98352" opacity=".8"/>
    <rect x="12" y="11.2" width="2" height="9.6" fill="#6b4220"/>
    <path d="M23.3 11.2 L31 16 L23.3 20.8 Z" fill="#ffffff" stroke="#2a1606" stroke-width="1.1" stroke-linejoin="round"/>
  </g>
</svg>`;

  // 7. Super Dual: míssil duplo cósmico / roxo flamejante com badge "SD"
  const SUPERDUAL_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="14" fill="url(#sdAura)" opacity="0.35"/>
  <g transform="translate(-2, 3) rotate(-35 14 14)">
    <path d="M5 14 L0 16 L5 18 Z" fill="#ff00ff"/>
    <path d="M5 10 L1 6 L9 10 Z" fill="#4a0e4e"/>
    <path d="M5 22 L1 26 L9 22 Z" fill="#4a0e4e"/>
    <rect x="5" y="10" width="14" height="12" rx="2" fill="#9c27b0" stroke="#2a0033" stroke-width="0.8"/>
    <path d="M19 10 L27 16 L19 22 Z" fill="#e1bee7" stroke="#2a0033" stroke-width="0.8"/>
  </g>
  <g transform="translate(5, -4) rotate(-35 14 14)">
    <path d="M5 14 L0 16 L5 18 Z" fill="#ffd700"/>
    <path d="M5 10 L1 6 L9 10 Z" fill="#b388ff"/>
    <path d="M5 22 L1 26 L9 22 Z" fill="#b388ff"/>
    <rect x="5" y="10" width="14" height="12" rx="2" fill="#e040fb" stroke="#2a0033" stroke-width="0.8"/>
    <path d="M19 10 L27 16 L19 22 Z" fill="#ffffff" stroke="#2a0033" stroke-width="0.8"/>
    <rect x="9" y="12" width="6" height="2" fill="#fff" opacity="0.8"/>
  </g>
  <path d="M7 6 L9 2 L11 6 L15 8 L11 10 L9 14 L7 10 L3 8 Z" fill="#ffd700" stroke="#b388ff" stroke-width="0.6"/>
  <rect x="14" y="17" width="17" height="13" rx="3" fill="#1a0033" stroke="#e040fb" stroke-width="1.1"/>
  <text x="22.5" y="27" font-size="8" font-weight="900" font-family="'Lilita One', sans-serif" text-anchor="middle" fill="#f5d0fe">SD</text>
  <defs>
    <radialGradient id="sdAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffd700"/>
      <stop offset="70%" stop-color="#e040fb"/>
      <stop offset="100%" stop-color="#e040fb" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`;

  // 8. Onda / Tsunami: onda marinha gigante com crista de espuma e spray
  const ONDA_SVG = `
<svg class="item-icon" viewBox="0 0 32 32" aria-hidden="true">
  <path d="M2 28 C7 24 10 27 16 25 C22 23 25 26 30 24 L30 30 L2 30 Z" fill="#0077b6"/>
  <path d="M2 25 C6 21 11 23 15 19 C20 14 22 8 28 8 C26 12 23 15 19 17 C15 20 10 20 2 25 Z" fill="#0096c7" stroke="#023e8a" stroke-width="1"/>
  <path d="M3 21 C8 16 13 18 17 14 C21 9 24 4 29 4 C27 8 24 12 20 14 C16 17 11 17 3 21 Z" fill="#00b4d8" stroke="#0077b6" stroke-width="1.1"/>
  <path d="M22 6 C24 3 27 2 30 3 C30 5 28 7 26 8 C24 7 23 7 22 6 Z" fill="#ffffff" stroke="#90e0ef" stroke-width="0.8"/>
  <circle cx="27" cy="5" r="1.5" fill="#ffffff"/>
  <circle cx="29" cy="8" r="1.2" fill="#caf0f8"/>
  <circle cx="25" cy="9.5" r="1" fill="#ffffff"/>
  <circle cx="26" cy="13" r="1.2" fill="#90e0ef"/>
  <circle cx="22" cy="11" r="1.4" fill="#ffffff"/>
  <path d="M12 28 C15 26 19 26 23 28" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.7"/>
</svg>`;

  GB.ITEMS = {
    dual:      { name: 'Dual',       short: 'D',   level: 1, icon: DUAL_SVG },
    dualplus:  { name: 'Dual+',      short: 'D+',  level: 1, icon: DUALPLUS_SVG },
    teleport:  { name: 'Teleporte',  short: 'TP',  level: 1, icon: TELEPORT_SVG },
    cure:      { name: 'Cura',       short: 'C',   level: 1, icon: CURE_SVG },
    nuclear:   { name: 'Nuclear',    short: 'Nuk', level: 2, icon: NUCLEAR_SVG },
    napalm:    { name: 'Napalm',     short: 'Nap', level: 2, icon: NAPALM_SVG },
    superdual: { name: 'Super Dual', short: 'SD',  level: 2, icon: SUPERDUAL_SVG },
    onda:      { name: 'Tsunami',    short: 'Ond', level: 2, icon: ONDA_SVG },
  };

  // HTML do rótulo de um item (ícone se existir, senão o texto curto)
  GB.itemLabelHTML = function (id) {
    const info = GB.ITEMS[id];
    if (!info) return '';
    return info.icon || `<span class="item-txt">${info.short}</span>`;
  };
})(window.GB);
