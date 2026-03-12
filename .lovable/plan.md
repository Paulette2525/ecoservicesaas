

# Plateforme de Gestion Commerciale — V1

## Vue d'ensemble
Plateforme CRM commerciale en français, design professionnel bleu/gris, avec gestion des rôles (Admin, Manager, Commercial), suivi des visites, catalogue produits, et dashboard de pilotage. Backend sur Lovable Cloud (Supabase).

---

## 1. Authentification & Gestion des utilisateurs
- **Connexion par invitation uniquement** : l'administrateur crée les comptes utilisateurs
- **3 rôles** : Administrateur, Manager, Commercial — stockés dans une table `user_roles` séparée
- **Permissions différenciées** :
  - Admin : gestion utilisateurs, accès total, configuration
  - Manager : performances, visites, clients
  - Commercial : ses visites, ses clients, ses demandes
- **Page d'administration** des utilisateurs (création, modification, désactivation)

## 2. Gestion des clients (Mini CRM)
- **Fiche client** : nom entreprise, ville, secteur d'activité, téléphone, email, commercial responsable
- **Historique client** : visites, produits demandés, commandes, notes internes
- **Recherche & filtres** : par nom, ville, commercial
- **Liste clients** avec vue tableau et pagination

## 3. Gestion des visites commerciales
- **Créer une visite** : client, date, commercial, localisation
- **Compte rendu** : texte libre + résumé
- **Produits demandés** : produit, quantité estimée, urgence
- **Statut** : opportunité / prise de contact / commande probable
- **Liste des visites** avec filtres par commercial, client, date, statut

## 4. Enregistrement & Résumé IA des visites
- **Bouton 🎙️ Enregistrer** dans la fiche visite
- Enregistrement audio via le navigateur
- **Transcription automatique** via ElevenLabs Speech-to-Text
- **Résumé IA** via Lovable AI (Gemini) extrayant :
  - Produits mentionnés
  - Besoins client
  - Objections
  - Prochaines actions
- Le résumé pré-remplit le compte rendu de visite

## 5. Catalogue produits
- **Fiche produit** : référence, nom, catégorie, description, stock disponible, délai d'approvisionnement
- **Recherche** par référence, nom, catégorie
- **Gestion CRUD** complète pour les admins/managers

## 6. Équivalences produits
- **Associer des produits équivalents** (relation many-to-many)
- **Suggestion automatique** : quand un commercial sélectionne un produit demandé, affichage des équivalents disponibles
- Interface d'administration des équivalences

## 7. Suivi des demandes clients
- **Créer une demande** : client, produit, quantité, date, commercial
- **Statut** : disponible / en rupture / en commande
- **Historique** : toutes les demandes par produit ou par client
- Vue liste avec filtres et recherche

## 8. Dashboard management
- **KPIs visuels** avec graphiques (Recharts) :
  - Nombre de visites par commercial / semaine / mois
  - Nombre d'opportunités commerciales
  - Produits les plus demandés
  - Clients les plus actifs
- Accessible aux rôles Manager et Admin

---

## Design & Navigation
- **Sidebar** avec navigation par module
- **Palette** : bleu corporate (#1e3a5f) et gris, style professionnel
- **Interface 100% française**
- **Responsive** pour tablette (utilisation terrain par les commerciaux)
- Composants shadcn/ui pour une UX cohérente

## Architecture technique
- **Frontend** : React + TypeScript + Tailwind + shadcn/ui
- **Backend** : Lovable Cloud (Supabase) — base de données, auth, edge functions, storage audio
- **IA** : Lovable AI (Gemini) pour les résumés de visites
- **Audio** : ElevenLabs pour la transcription speech-to-text
- **Graphiques** : Recharts pour le dashboard

