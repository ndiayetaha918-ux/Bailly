# Direction de design

Conçu avec le **Taste Skill** de Leonxlnx ([github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)), installé dans le dépôt (`.claude/skills/design-taste-frontend`, `.claude/skills/redesign-existing-projects`, verrou dans `skills-lock.json`).

Le skill vise d'abord les pages marketing ; sa section 13 exclut les dashboards. Il a donc été appliqué ainsi : lecture du brief, réglages, directives typographie / couleur / formes / mouvement, liste des « AI tells » et contrôle pré-livraison sur toute l'application ; ses règles propres aux landing pages (hero, logos, bento marketing) uniquement là où elles ont un sens, c'est-à-dire l'accueil.

## Lecture du brief

> **Reading this as:** application de gestion locative à trois rôles pour des propriétaires, agences et locataires à Dakar, avec un langage contemporain de « signalétique d'immeuble », s'appuyant sur React + Tailwind v4 + Motion + React Three Fiber, Bricolage Grotesque et Geist.

| Réglage | Valeur | Pourquoi |
|---|---|---|
| `DESIGN_VARIANCE` | 6 | Un outil quotidien doit rester prévisible ; la variance est réservée aux moments forts (accueil, carte de loyer, quittance). |
| `MOTION_INTENSITY` | 5 | Le mouvement sert les changements d'état : étages qui montent, fenêtres qui s'allument, quittance qui sort. Pas de boucles décoratives. |
| `VISUAL_DENSITY` | 4 / 7 / 3 | Propriétaire 4 (vue d'ensemble), gestionnaire 7 (outil d'opérations), locataire 3 (une chose à faire). |

## L'idée : l'immeuble comme interface

Le local est au cœur du produit, donc l'élément signature est **la façade** : chaque immeuble est dessiné en élévation, chaque local est une fenêtre colorée par l'état de son loyer. Ce n'est pas une illustration : c'est une surface de navigation (on clique une fenêtre pour ouvrir le local) et une lecture d'état instantanée.

Le même langage de cellule se décline partout :

- **Accueil** : la façade prévisualise ce que verra chaque rôle (tout le patrimoine, seulement ce qui demande une action, une seule fenêtre allumée).
- **Barre des loyers** : le mois en une barre, chaque segment est un local, sa largeur est son loyer. Une progression sans piste vide.
- **Échéancier** : douze mois en douze cellules, la hauteur du remplissage est ce qui a été payé.
- **Mini-façades** dans les listes d'échanges et la file du gestionnaire : on sait où se trouve le local avant de lire.
- **Maquette 3D** dans le constructeur et la vue immeuble : même volumes, en relief.
- Le vide a une texture : un local vacant est **hachuré**, jamais coloré.

## Trois expériences, trois structures

- **Propriétaire** : barre de navigation haute, pages aérées, lecture patrimoniale (encaissé du mois, biens, tendance).
- **Gestionnaire** : rail sombre, surfaces denses, une **file d'attention** triée par priorité (retards, virements à confirmer, réclamations urgentes, baux) avec le détail et les actions à côté, navigation clavier `j` / `k`.
- **Locataire** : application mobile d'abord, barre d'onglets flottante ; l'accueil répond à « combien, quand, comment payer ».

## Couleur

Fond papier vert-gris froid (pas de beige), vert forêt profond pour les surfaces fortes, émeraude pour l'action. Un seul accent chaud, le **vermillon** `signal`, réservé à ce qui demande une attention ; l'ambre pour « partiel ». Tokens dans `src/styles/index.css`, versions sombres définies et testées (mode clair, sombre ou système dans le menu du compte).

Palette du graphique validée avec le skill `dataviz` (`validate_palette.js`) en clair et en sombre.

## Typographie

- **Bricolage Grotesque** (variable, axes `wdth` et `opsz`), légèrement condensée : titres, montants, codes de locaux. Elle évoque la signalétique peinte des immeubles et donne une vraie voix aux chiffres.
- **Geist** pour l'interface, **Geist Mono** pour les références (numéros de quittance, transactions, codes).
- Pas de serif, pas d'Inter. Chiffres tabulaires uniquement dans les colonnes.

## Formes (règle unique)

| Élément | Rayon |
|---|---|
| Panneaux, feuilles | 20 px (carte locataire 24 px) |
| Surfaces imbriquées | 14 à 16 px |
| Contrôles, champs, boutons | 10 à 12 px |
| Cellules architecturales | 2 à 5 px selon l'échelle |
| Pastilles, avatars ronds | plein |

## Mouvement

Chaque animation répond à une raison : hiérarchie (les fenêtres s'allument de bas en haut à l'arrivée), état (étages qui montent dans la maquette, file qui se vide), retour (anneaux pendant la validation sur téléphone), récit (la quittance sort de la fente). Tout est neutralisé avec `prefers-reduced-motion`.

## Contrôle pré-livraison (section 14 du skill)

- Zéro tiret cadratin ou demi-cadratin dans l'interface.
- Un thème par page ; l'accueil est entièrement vert forêt, l'application sur papier.
- Un accent, des couleurs d'état sémantiques et rationnées, une règle de rayons documentée.
- Contrastes des boutons et champs vérifiés en clair et en sombre.
- Pas d'eyebrow en capitales espacées, pas de numérotation de sections, pas de « Étape 1 ».
- Pastilles colorées uniquement pour un état réel (non lu, statut de loyer).
- Icônes Phosphor uniquement ; seule la marque du logo est dessinée (géométrie simple).
- Noms, quartiers et montants vraisemblables pour Dakar, explicitement fictifs.
- États vides, chargement (squelettes) et erreurs (paiement refusé, formulaires) traités.
- `min-h-[100dvh]`, mises en page mobiles explicites, aucun écouteur de scroll.
