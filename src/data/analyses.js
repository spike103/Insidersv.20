export const ANALYSES = {
  comportement: {
    label: 'Comportement', icon: 'brain', color: '#8B5CF6',
    items: [
      { id: 'tilt_detection', title: 'Détection de tilt', desc: 'Séries de paris rapprochés après une perte' },
      { id: 'revenge_betting', title: 'Paris de vengeance', desc: 'Montants qui explosent après des pertes' },
      { id: 'session_length', title: 'Durée de session', desc: 'Quand la fatigue mentale s\'installe' },
      { id: 'overconfidence', title: 'Excès de confiance', desc: 'Mises grandissantes sur streak gagnante' },
      { id: 'fomo_index', title: 'Indice FOMO', desc: 'Paris pris sous pression du temps' },
    ],
  },
  performance: {
    label: 'Performance', icon: 'trending_up', color: '#10B981',
    items: [
      { id: 'roi_global', title: 'ROI global', desc: 'Rendement sur investissement' },
      { id: 'winrate_surface', title: 'Win rate par surface', desc: 'Dur / Terre / Gazon / Indoor' },
      { id: 'winrate_bet_type', title: 'Win rate par type', desc: 'Vainqueur, handicap, total...' },
      { id: 'cote_range', title: 'Performance par cote', desc: 'Favoris vs outsiders' },
      { id: 'best_players', title: 'Meilleurs joueurs', desc: 'Tes paris les plus rentables' },
      { id: 'combo_vs_simple', title: 'Combinés vs simples', desc: 'Écart de rentabilité' },
    ],
  },
  financier: {
    label: 'Financier', icon: 'wallet', color: '#F5B82E',
    items: [
      { id: 'bankroll_evolution', title: 'Évolution bankroll', desc: 'Courbe du capital' },
      { id: 'drawdown_max', title: 'Drawdown max', desc: 'Pire chute depuis un sommet' },
      { id: 'stake_discipline', title: 'Discipline de mise', desc: 'Respect de la stratégie' },
      { id: 'profit_factor', title: 'Facteur de profit', desc: 'Gains bruts / pertes brutes' },
      { id: 'kelly_gap', title: 'Écart au Kelly', desc: 'Mises vs mises optimales' },
    ],
  },
  tendance: {
    label: 'Tendance', icon: 'chart_bar', color: '#06B6D4',
    items: [
      { id: 'hot_streak', title: 'Séries chaudes/froides', desc: 'Détection des vagues' },
      { id: 'day_hour_heatmap', title: 'Heatmap jour/heure', desc: 'Tes meilleurs créneaux' },
      { id: 'monthly_trend', title: 'Tendance mensuelle', desc: 'Évolution ROI par mois' },
      { id: 'tournament_roi', title: 'ROI par tournoi', desc: 'Tes tournois fétiches' },
      { id: 'tour_atp_wta', title: 'ATP vs WTA', desc: 'Performance par circuit' },
    ],
  },
}

export const ANALYSES_FLAT = Object.entries(ANALYSES).flatMap(([catId, cat]) =>
  cat.items.map((item) => ({ ...item, category: catId, categoryLabel: cat.label, categoryColor: cat.color, categoryIcon: cat.icon }))
)
