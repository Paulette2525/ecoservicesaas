

# Ajouter le profil et nom du contact rencontré lors d'une visite

## Migration base de données
Ajouter deux colonnes à la table `visits` :
- `contact_role` (text, nullable) — profil du contact : directeur, responsable_achat, technicien, commercial, magasinier
- `contact_name` (text, nullable) — nom de la personne rencontrée

## Modification du formulaire de visite (`Visits.tsx`)
- Ajouter un champ **Select** "Profil rencontré" avec les 5 options
- Ajouter un champ **Input** "Nom du contact" (texte libre)
- Inclure ces deux champs dans le payload d'insertion/mise à jour
- Mettre à jour l'interface TypeScript `Visit` avec `contact_role` et `contact_name`

## Affichage
- Afficher le profil et le nom du contact dans les cartes mobiles et le tableau desktop
- Afficher ces infos dans le dialogue de détail de la visite

