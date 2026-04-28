# Insiders v2 🎾

> Every bet hides a truth. Join those who hold it.

## 🚀 Installation

```bash
npm install
npm run dev
```

Puis ouvre `http://localhost:5173`.

## 📦 Build production

```bash
npm run build
```
→ dossier `dist/` prêt pour Netlify/Vercel/n'importe quel hébergement statique.

## 🌐 Déploiement Netlify

1. Push le dossier sur GitHub
2. Netlify : **Add new site → Import from Git → sélectionner le repo**
3. Netlify lit automatiquement `netlify.toml` (build `npm run build`, publish `dist`)
4. Deploy → URL live en 2 min

## 📱 Ce qui est livré (v2)

### Design system strict
- Palette officielle : `--ink-900 #020b20` navy, `--blue-500 #2962ff` unique accent, gold gradient pour Masters/Prestige, vert/rouge outcomes
- **Police Poppins** locale (4 poids) + Google Fonts fallback
- **13 icônes custom SVG** : add, bell, bell-notification, calendar-clock, clear, coins, crown, dashboard, filter, home, incognito, arrow-down, logo Insiders
- **3 illustrations PNG** officielles dans `/public/illustrations/`
- Classes CSS : `.display`, `.h1`, `.h2`, `.h3`, `.body`, `.caption`, `.stat-value`, `.accent-word`, `.pill-label`, `.card`, `.card-gold`, `.btn-primary`, `.btn-ghost`, `.btn-add`, `.chip`, `.community-pill`, `.segmented`, `.seg-btn`

### Navigation
- **TopBar** : `👑 42 coins` + pill `INSIDERS` bleue bordée + cloche notification + avatar
- **BottomNav 4 items + [+] central** :
  - Mes paris · Matchs · **Tennis** (fusion Players+Tournaments avec tabs) · Stats
  - Bouton [+] bleu lumineux au centre → `/add-bet`

### Pages
| Route | Page | Contenu |
|---|---|---|
| `/` | Home | Greeting "Salut, PSEUDO !", Vue d'ensemble / Performance, bankroll hero, insights, paris récents |
| `/matchs` | Matchs | Tous les paris groupés par jour, filtres Tous/En cours/Gagnés/Perdus/Live |
| `/tennis` | Tennis | Tabs Joueurs (liste cliquable) / Tournois (calendrier par mois, gold sur prestige) |
| `/players/:name` | PlayerDetail | Stats du joueur + liste tournois + historique paris |
| `/stats` | Stats | Récap éditorial (ROI géant, Radar, chapitres) + 21 analyses |
| `/add-bet` | AddBet | Formulaire structuré + tournois filtrés par date |
| `/settings` | Settings | Profil, bankroll, stratégie, objectifs, joueurs custom, reset |
| `/login` | Login | "EVERY BET HIDES A TRUTH" italique |
| Onboarding | 3 slides | FOLLOW / ADD / DISCOVER avec illustrations |

### AddBet — nouvelle structure
1. **Simple / Combiné / Live** (tabs)
2. **Joueur 1 vs Joueur 2** (autocomplete + option "Ajouter comme nouveau joueur")
3. **Date du match**
4. **Tournoi filtré** — uniquement ceux actifs à la date saisie (~40 tournois 2025)
5. **Circuit + Surface** (auto-remplis depuis tournoi sélectionné)
6. **Type de pari** (+ personnalisés)
7. **Mise en € ou en % de bankroll** (toggle)
8. **Cote** + gain potentiel affiché en direct
9. **Bouton « Enregistrer le pari » collé en bas** (sticky)

### Calendrier tennis 2025 complet
~40 tournois réels avec dates précises — de United Cup (jan) à Coupe Davis (nov) :
- 4 Grand Chelems : Open d'Australie, Roland-Garros, Wimbledon, US Open
- 9 Masters 1000 : Indian Wells, Miami, Monte-Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, Paris
- Tous marqués `isPrestige: true` → cadre doré
- Filtrage automatique par date dans le formulaire AddBet

### Logique de betting préservée
- **60 joueurs ATP/WTA** officiels (avec drapeaux) + joueurs customs auto-ajoutés
- **Stats** : ROI, profit, win rate, streak, drawdown, profit factor, tilt detection, heatmap
- **Filtres** : timeframe, surface, tour, betType, status, oddRange, player, tournament
- **21 analyses** en 4 catégories : Comportement, Performance, Financier, Tendance
- **Multi-user** via localStorage (pseudo + onboarding par user)

### Joueurs custom — auto-add
Quand tu saisis un joueur dans AddBet qui n'est pas dans les 60 officiels :
- Il est automatiquement ajouté à ta liste perso (tag "perso")
- Il apparaît dans `/tennis` → tab Joueurs
- Clic dessus → `/players/:name` avec ses stats et historique
- Gérable/supprimable depuis Settings

### Page détail joueur
Clic sur n'importe quel joueur dans la liste :
- Hero avec flag, initiales en bleu italique, circuit/rang
- KPI : Profit, ROI, nombre de paris, % réussis
- Bilan : gagnés / perdus / en cours
- **Tournois** — classés par profit, avec flag et catégorie
- **Historique complet** des paris sur ce joueur

## 🗺️ Roadmap Phase 2+

### Supabase (Auth + Postgres + RLS)
- Migration `localStorage` → tables `users`, `bets`, `custom_players`, `strategies`, `goals`
- Row Level Security : `auth.uid() = user_id`
- Index sur `(user_id, date DESC)` pour les requêtes bet-list

### Stripe (Premium)
- Abonnements + webhook Netlify Functions
- Features gatées derrière `role: 'pro'` : export CSV, >50 paris, analyses avancées

### Sécurité & cost control
- Zod schemas front/back
- Rate limiting (100 req/min/IP via Upstash Redis)
- Cache React Query, `staleTime: 30s`
- Sentry + Netlify branch deploys (staging/prod)

## 🎨 Règles de brand

- Fond **toujours** `#020b20` — jamais blanc
- **Un seul** accent : bleu électrique `#2962ff`
- Or **uniquement** sur Masters 1000 + Grand Chelems
- Vert/rouge **uniquement** pour les outcomes numériques (ROI, profit, win/loss)
- **Zéro emoji** sauf drapeaux (qui sont de la data, pas de la décoration)
- Typography : **Poppins**, italic = voice brand (mot accent + pill labels)
- Titres : **uppercase italique** pour les moments brand, Title Case pour l'utilitaire

## 📁 Structure

```
insiders/
├── public/
│   ├── fonts/           4 Poppins TTF
│   ├── icons/           13 SVG (12 custom + logo)
│   └── illustrations/   3 PNG officielles
├── src/
│   ├── App.jsx          Router + guards
│   ├── main.jsx         Entry
│   ├── index.css        Design system
│   ├── components/      Logo, TopBar, BottomNav, Icon, BetCard, Charts, UI
│   ├── contexts/        AppContext (auth, CRUD, stratégie, goals, custom players)
│   ├── data/            players.js (60), tournaments.js (~40), betTypes, analyses
│   ├── pages/           Login, Onboarding, Home, Matchs, Tennis, PlayerDetail, Stats, AddBet, Settings
│   └── utils/           stats.js
├── index.html
├── netlify.toml
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

v2 — design system officiel intégré, AddBet repensé, joueurs custom + page détail joueur, calendrier 2025 complet.
