// Calendrier tennis 2025 complet avec dates ISO
// start/end au format YYYY-MM-DD pour filtrage par date

const fl = (c) => ({
  AUS:'🇦🇺', FRA:'🇫🇷', GBR:'🇬🇧', USA:'🇺🇸', MON:'🇲🇨', ESP:'🇪🇸',
  ITA:'🇮🇹', CAN:'🇨🇦', CHN:'🇨🇳', QAT:'🇶🇦', UAE:'🇦🇪', MEX:'🇲🇽',
  AUT:'🇦🇹', SUI:'🇨🇭', KSA:'🇸🇦', INT:'🌍', GER:'🇩🇪', HKG:'🇭🇰',
  NZL:'🇳🇿', NED:'🇳🇱', JPN:'🇯🇵', MAR:'🇲🇦',
}[c] || '🏳️')

// Prestige : Grand Slam + Masters 1000 + WTA 1000 → cadre doré
export const TOURNAMENTS = [
  // JANVIER — Tournée australienne
  { id: 't_united_cup', name: 'United Cup', category: 'Équipes', tour: 'Mixte', surface: 'Hard', city: 'Sydney/Perth', country: 'AUS', flag: fl('AUS'), start: '2025-01-04', end: '2025-01-11', dates: '04 — 11 Janv.' },
  { id: 't_brisbane', name: 'Brisbane International', category: 'ATP 250 / WTA 500', tour: 'Mixte', surface: 'Hard', city: 'Brisbane', country: 'AUS', flag: fl('AUS'), start: '2025-01-05', end: '2025-01-11', dates: '05 — 11 Janv.' },
  { id: 't_hong_kong', name: 'Hong Kong Open', category: 'ATP 250', tour: 'ATP', surface: 'Hard', city: 'Hong Kong', country: 'HKG', flag: fl('HKG'), start: '2025-01-05', end: '2025-01-11', dates: '05 — 11 Janv.' },
  { id: 't_auckland_asb', name: 'Auckland (ASB Classic)', category: 'WTA 250', tour: 'WTA', surface: 'Hard', city: 'Auckland', country: 'NZL', flag: fl('NZL'), start: '2025-01-05', end: '2025-01-11', dates: '05 — 11 Janv.' },
  { id: 't_adelaide', name: 'Adelaide International', category: 'ATP 250 / WTA 500', tour: 'Mixte', surface: 'Hard', city: 'Adelaide', country: 'AUS', flag: fl('AUS'), start: '2025-01-12', end: '2025-01-18', dates: '12 — 18 Janv.' },
  { id: 't_hobart', name: 'Hobart International', category: 'WTA 250', tour: 'WTA', surface: 'Hard', city: 'Hobart', country: 'AUS', flag: fl('AUS'), start: '2025-01-12', end: '2025-01-18', dates: '12 — 18 Janv.' },
  { id: 't_auckland_atp', name: 'Auckland (ATP)', category: 'ATP 250', tour: 'ATP', surface: 'Hard', city: 'Auckland', country: 'NZL', flag: fl('NZL'), start: '2025-01-12', end: '2025-01-18', dates: '12 — 18 Janv.' },
  { id: 't_ao', name: "Open d'Australie", category: 'Grand Chelem', tour: 'Mixte', surface: 'Hard', city: 'Melbourne', country: 'AUS', flag: fl('AUS'), start: '2025-01-18', end: '2025-02-01', dates: '18 Janv. — 01 Fév.', isPrestige: true },

  // FÉVRIER
  { id: 't_montpellier', name: 'Montpellier (Open Occitanie)', category: 'ATP 250', tour: 'ATP', surface: 'Indoor', city: 'Montpellier', country: 'FRA', flag: fl('FRA'), start: '2025-02-02', end: '2025-02-08', dates: '02 — 08 Fév.' },
  { id: 't_abu_dhabi', name: 'Abu Dhabi', category: 'WTA 500', tour: 'WTA', surface: 'Hard', city: 'Abu Dhabi', country: 'UAE', flag: fl('UAE'), start: '2025-02-02', end: '2025-02-08', dates: '02 — 08 Fév.' },
  { id: 't_doha', name: 'Doha (Qatar Open)', category: 'WTA 1000 / ATP 250', tour: 'Mixte', surface: 'Hard', city: 'Doha', country: 'QAT', flag: fl('QAT'), start: '2025-02-09', end: '2025-02-15', dates: '09 — 15 Fév.', isPrestige: true },
  { id: 't_rotterdam', name: 'Rotterdam (ABN AMRO)', category: 'ATP 500', tour: 'ATP', surface: 'Indoor', city: 'Rotterdam', country: 'NED', flag: fl('NED'), start: '2025-02-09', end: '2025-02-15', dates: '09 — 15 Fév.' },
  { id: 't_dubai', name: 'Dubaï Championships', category: 'WTA 1000 / ATP 500', tour: 'Mixte', surface: 'Hard', city: 'Dubaï', country: 'UAE', flag: fl('UAE'), start: '2025-02-16', end: '2025-02-22', dates: '16 — 22 Fév.', isPrestige: true },
  { id: 't_acapulco', name: 'Acapulco', category: 'ATP 500', tour: 'ATP', surface: 'Hard', city: 'Acapulco', country: 'MEX', flag: fl('MEX'), start: '2025-02-23', end: '2025-03-01', dates: '23 Fév. — 01 Mars' },
  { id: 't_san_diego', name: 'San Diego', category: 'WTA 500', tour: 'WTA', surface: 'Hard', city: 'San Diego', country: 'USA', flag: fl('USA'), start: '2025-02-23', end: '2025-03-01', dates: '23 Fév. — 01 Mars' },

  // MARS — Sunshine Double
  { id: 't_indian_wells', name: 'Indian Wells (BNP Paribas Open)', category: 'Masters 1000 / WTA 1000', tour: 'Mixte', surface: 'Hard', city: 'Indian Wells', country: 'USA', flag: fl('USA'), start: '2025-03-04', end: '2025-03-15', dates: '04 — 15 Mars', isPrestige: true },
  { id: 't_miami', name: 'Miami Open', category: 'Masters 1000 / WTA 1000', tour: 'Mixte', surface: 'Hard', city: 'Miami', country: 'USA', flag: fl('USA'), start: '2025-03-18', end: '2025-03-29', dates: '18 — 29 Mars', isPrestige: true },

  // AVRIL-MAI — Terre battue
  { id: 't_monte_carlo', name: 'Monte-Carlo Masters', category: 'Masters 1000', tour: 'ATP', surface: 'Clay', city: 'Monaco', country: 'MON', flag: fl('MON'), start: '2025-04-05', end: '2025-04-12', dates: '05 — 12 Avril', isPrestige: true },
  { id: 't_charleston', name: 'Charleston', category: 'WTA 500', tour: 'WTA', surface: 'Clay', city: 'Charleston', country: 'USA', flag: fl('USA'), start: '2025-04-05', end: '2025-04-12', dates: '05 — 12 Avril' },
  { id: 't_barcelona', name: 'Barcelone', category: 'ATP 500', tour: 'ATP', surface: 'Clay', city: 'Barcelone', country: 'ESP', flag: fl('ESP'), start: '2025-04-13', end: '2025-04-19', dates: '13 — 19 Avril' },
  { id: 't_munich', name: 'Munich (BMW Open)', category: 'ATP 500', tour: 'ATP', surface: 'Clay', city: 'Munich', country: 'GER', flag: fl('GER'), start: '2025-04-11', end: '2025-04-19', dates: '11 — 19 Avril' },
  { id: 't_stuttgart_wta', name: 'Stuttgart (Porsche GP)', category: 'WTA 500', tour: 'WTA', surface: 'Clay', city: 'Stuttgart', country: 'GER', flag: fl('GER'), start: '2025-04-13', end: '2025-04-19', dates: '13 — 19 Avril' },
  { id: 't_madrid', name: 'Madrid Open', category: 'Masters 1000 / WTA 1000', tour: 'Mixte', surface: 'Clay', city: 'Madrid', country: 'ESP', flag: fl('ESP'), start: '2025-04-22', end: '2025-05-03', dates: '22 Avril — 03 Mai', isPrestige: true },
  { id: 't_rome', name: "Rome (Internazionali d'Italia)", category: 'Masters 1000 / WTA 1000', tour: 'Mixte', surface: 'Clay', city: 'Rome', country: 'ITA', flag: fl('ITA'), start: '2025-05-06', end: '2025-05-17', dates: '06 — 17 Mai', isPrestige: true },
  { id: 't_geneva', name: 'Genève', category: 'ATP 250', tour: 'ATP', surface: 'Clay', city: 'Genève', country: 'SUI', flag: fl('SUI'), start: '2025-05-18', end: '2025-05-24', dates: '18 — 24 Mai' },
  { id: 't_lyon', name: 'Lyon', category: 'ATP 250', tour: 'ATP', surface: 'Clay', city: 'Lyon', country: 'FRA', flag: fl('FRA'), start: '2025-05-18', end: '2025-05-24', dates: '18 — 24 Mai' },
  { id: 't_strasbourg', name: 'Strasbourg', category: 'WTA 500', tour: 'WTA', surface: 'Clay', city: 'Strasbourg', country: 'FRA', flag: fl('FRA'), start: '2025-05-18', end: '2025-05-24', dates: '18 — 24 Mai' },
  { id: 't_rg', name: 'Roland-Garros', category: 'Grand Chelem', tour: 'Mixte', surface: 'Clay', city: 'Paris', country: 'FRA', flag: fl('FRA'), start: '2025-05-25', end: '2025-06-07', dates: '25 Mai — 07 Juin', isPrestige: true },

  // JUIN-JUILLET — Gazon
  { id: 't_stuttgart_atp', name: 'Stuttgart', category: 'ATP 250', tour: 'ATP', surface: 'Grass', city: 'Stuttgart', country: 'GER', flag: fl('GER'), start: '2025-06-08', end: '2025-06-14', dates: '08 — 14 Juin' },
  { id: 't_shertogenbosch', name: "'s-Hertogenbosch", category: 'ATP 250 / WTA 250', tour: 'Mixte', surface: 'Grass', city: "'s-Hertogenbosch", country: 'NED', flag: fl('NED'), start: '2025-06-08', end: '2025-06-14', dates: '08 — 14 Juin' },
  { id: 't_halle', name: 'Halle', category: 'ATP 500', tour: 'ATP', surface: 'Grass', city: 'Halle', country: 'GER', flag: fl('GER'), start: '2025-06-15', end: '2025-06-21', dates: '15 — 21 Juin' },
  { id: 't_queens', name: "Queen's Club", category: 'ATP 500', tour: 'ATP', surface: 'Grass', city: 'Londres', country: 'GBR', flag: fl('GBR'), start: '2025-06-15', end: '2025-06-21', dates: '15 — 21 Juin' },
  { id: 't_berlin', name: 'Berlin', category: 'WTA 500', tour: 'WTA', surface: 'Grass', city: 'Berlin', country: 'GER', flag: fl('GER'), start: '2025-06-15', end: '2025-06-21', dates: '15 — 21 Juin' },
  { id: 't_wimbledon', name: 'Wimbledon', category: 'Grand Chelem', tour: 'Mixte', surface: 'Grass', city: 'Londres', country: 'GBR', flag: fl('GBR'), start: '2025-06-29', end: '2025-07-12', dates: '29 Juin — 12 Juil.', isPrestige: true },
  { id: 't_hamburg', name: 'Hambourg', category: 'ATP 500', tour: 'ATP', surface: 'Clay', city: 'Hambourg', country: 'GER', flag: fl('GER'), start: '2025-07-13', end: '2025-07-19', dates: '13 — 19 Juil.' },
  { id: 't_gstaad', name: 'Gstaad', category: 'ATP 250', tour: 'ATP', surface: 'Clay', city: 'Gstaad', country: 'SUI', flag: fl('SUI'), start: '2025-07-13', end: '2025-07-19', dates: '13 — 19 Juil.' },
  { id: 't_bastad', name: 'Båstad', category: 'ATP 250', tour: 'ATP', surface: 'Clay', city: 'Båstad', country: 'INT', flag: '🇸🇪', start: '2025-07-13', end: '2025-07-19', dates: '13 — 19 Juil.' },

  // AOÛT
  { id: 't_washington', name: 'Washington (Citi DC Open)', category: 'ATP 500 / WTA 500', tour: 'Mixte', surface: 'Hard', city: 'Washington', country: 'USA', flag: fl('USA'), start: '2025-08-03', end: '2025-08-09', dates: '03 — 09 Août' },
  { id: 't_canada', name: 'National Bank Open (Canada)', category: 'Masters 1000 / WTA 1000', tour: 'Mixte', surface: 'Hard', city: 'Montréal/Toronto', country: 'CAN', flag: fl('CAN'), start: '2025-08-10', end: '2025-08-16', dates: '10 — 16 Août', isPrestige: true },
  { id: 't_cincinnati', name: 'Cincinnati Open', category: 'Masters 1000 / WTA 1000', tour: 'Mixte', surface: 'Hard', city: 'Cincinnati', country: 'USA', flag: fl('USA'), start: '2025-08-17', end: '2025-08-23', dates: '17 — 23 Août', isPrestige: true },
  { id: 't_us_open', name: 'US Open', category: 'Grand Chelem', tour: 'Mixte', surface: 'Hard', city: 'New York', country: 'USA', flag: fl('USA'), start: '2025-08-31', end: '2025-09-13', dates: '31 Août — 13 Sept.', isPrestige: true },

  // SEPT-OCT — Tournée asiatique
  { id: 't_laver', name: 'Laver Cup', category: 'Exhibition', tour: 'ATP', surface: 'Indoor', city: 'San Francisco', country: 'USA', flag: fl('USA'), start: '2025-09-21', end: '2025-09-27', dates: '21 — 27 Sept.' },
  { id: 't_beijing', name: 'Pékin (China Open)', category: 'ATP 500 / WTA 1000', tour: 'Mixte', surface: 'Hard', city: 'Pékin', country: 'CHN', flag: fl('CHN'), start: '2025-09-30', end: '2025-10-06', dates: '30 Sept. — 06 Oct.', isPrestige: true },
  { id: 't_tokyo', name: 'Tokyo', category: 'ATP 500', tour: 'ATP', surface: 'Hard', city: 'Tokyo', country: 'JPN', flag: fl('JPN'), start: '2025-09-30', end: '2025-10-06', dates: '30 Sept. — 06 Oct.' },
  { id: 't_shanghai', name: 'Shanghai Masters', category: 'Masters 1000', tour: 'ATP', surface: 'Hard', city: 'Shanghai', country: 'CHN', flag: fl('CHN'), start: '2025-10-07', end: '2025-10-18', dates: '07 — 18 Oct.', isPrestige: true },
  { id: 't_wuhan', name: 'Wuhan Open', category: 'WTA 1000', tour: 'WTA', surface: 'Hard', city: 'Wuhan', country: 'CHN', flag: fl('CHN'), start: '2025-10-12', end: '2025-10-18', dates: '12 — 18 Oct.', isPrestige: true },

  // NOVEMBRE — Finales
  { id: 't_paris_masters', name: 'Rolex Paris Masters', category: 'Masters 1000', tour: 'ATP', surface: 'Indoor', city: 'Paris', country: 'FRA', flag: fl('FRA'), start: '2025-11-02', end: '2025-11-08', dates: '02 — 08 Nov.', isPrestige: true },
  { id: 't_wta_finals', name: 'WTA Finals (Riyad)', category: 'Finales', tour: 'WTA', surface: 'Hard', city: 'Riyad', country: 'KSA', flag: fl('KSA'), start: '2025-11-09', end: '2025-11-15', dates: '09 — 15 Nov.' },
  { id: 't_atp_finals', name: 'Nitto ATP Finals', category: 'Finales', tour: 'ATP', surface: 'Indoor', city: 'Turin', country: 'ITA', flag: fl('ITA'), start: '2025-11-15', end: '2025-11-22', dates: '15 — 22 Nov.' },
  { id: 't_davis', name: 'Coupe Davis (Final 8)', category: 'Équipes', tour: 'ATP', surface: 'Indoor', city: 'Málaga', country: 'ESP', flag: fl('ESP'), start: '2025-11-18', end: '2025-11-23', dates: 'Fin Novembre' },
]

export const CATEGORIES = [
  { id: 'Grand Chelem', label: 'Grand Chelem', color: '#f0e080' },
  { id: 'Masters 1000', label: 'Masters 1000', color: '#f0e080' },
  { id: 'ATP 500', label: 'ATP/WTA 500', color: '#2962ff' },
  { id: 'ATP 250', label: 'ATP/WTA 250', color: '#5b83ff' },
  { id: 'Finales', label: 'Finales', color: '#ef4444' },
  { id: 'Équipes', label: 'Coupes', color: '#22c55e' },
]

// Retourne les tournois actifs à une date donnée (YYYY-MM-DD)
// On compare sur mois+jour seulement (l'année peut varier, le calendrier tennis est annuel)
export function tournamentsOnDate(dateStr) {
  if (!dateStr) return []
  const md = dateStr.slice(5) // "MM-DD"
  return TOURNAMENTS.filter(t => {
    const startMd = t.start.slice(5)
    const endMd = t.end.slice(5)
    // Gérer le chevauchement d'année (peu probable ici, mais safe)
    if (startMd <= endMd) return md >= startMd && md <= endMd
    return md >= startMd || md <= endMd
  })
}

// Regroupe par mois pour l'affichage
export function tournamentsByMonth() {
  const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const map = {}
  TOURNAMENTS.forEach(t => {
    const m = Number(t.start.slice(5, 7))
    if (!map[m]) map[m] = { month: m, label: months[m - 1], items: [] }
    map[m].items.push(t)
  })
  return Object.values(map).sort((a, b) => a.month - b.month)
}
