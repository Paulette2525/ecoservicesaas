

# Page dédiée "Activité des commerciaux" + Filtres mis à jour

## 1. Nouvelle page `src/pages/CommercialActivity.tsx`

Page complète accessible aux admins/managers avec une vue détaillée par commercial :

- **En-tête** : titre + barre de filtres (Cette semaine | Ce mois | Personnalisé)
- **Tableau récapitulatif** : chaque commercial avec nb visites, nb clients uniques, dernière visite, taux de conversion (commandes probables / visites)
- **Clic sur un commercial** → section détaillée qui s'ouvre avec :
  - **KPIs individuels** : visites totales, clients visités, rapports générés
  - **Graphique barres** : performance mensuelle (nb visites par semaine/mois sur la période)
  - **Liste des dernières visites** : client, date, statut, résumé (clic pour voir le détail complet avec onglets Résumé/Transcription/Rapport)
  - **Clients visités** : liste unique des clients avec nb de visites chacun

## 2. Mise à jour des filtres sur Dashboard (`src/pages/Dashboard.tsx`)

- Remplacer les presets "Ce mois", "Ce trimestre", "Cette année" par **"Cette semaine"** et **"Ce mois"** uniquement
- Garder le picker personnalisé tel quel
- Ajouter `startOfWeek`/`endOfWeek` depuis date-fns
- Type `PeriodPreset` → `"week" | "month" | "custom"`

## 3. Routing et navigation

- **`src/App.tsx`** : ajouter route `/commercial-activity` → `CommercialActivity`
- **`src/components/AppSidebar.tsx`** : ajouter entrée "Activité commerciaux" avec icône `Users` après Dashboard, rôles `["admin", "manager"]`

## Fichiers modifiés/créés
1. `src/pages/CommercialActivity.tsx` — nouvelle page complète
2. `src/pages/Dashboard.tsx` — filtres semaine/mois au lieu de mois/trimestre/année
3. `src/App.tsx` — nouvelle route
4. `src/components/AppSidebar.tsx` — nouvel item de navigation

