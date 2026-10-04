# Bailly

Plateforme de gestion locative pour propriétaires, gestionnaires et locataires, à Dakar.
Le **local** est au centre : chaque loyer, paiement, quittance, message et réclamation est rattaché à un local précis.

Ce dépôt contient le MVP visuel et fonctionnel : trois expériences distinctes, des données fictives cohérentes, un paiement mobile money simulé (prêt pour InTouch) et une vraie quittance après paiement.

> Le brief mentionnait « [NOM DU PRODUIT] ». Le nom **Bailly** est repris du nom du dépôt (et de « bail »). Il se change dans `index.html`, `src/components/brand/Logo.tsx` et les textes.

## Essayer sans installer

Version autonome (un seul fichier, régénérée par `npm run build:preview`) :
https://raw.githack.com/ndiayetaha918-ux/Bailly/main/preview/index.html

### Variante Touchpoint Loclic (groupe InTouch)

Même produit, aux couleurs TouchPoint (bleu marine, carmin, lavande, police arrondie), avec le wallet TouchPoint proposé en premier moyen de paiement et les montants en « F » :
https://raw.githack.com/ndiayetaha918-ux/Bailly/main/preview/loclic/index.html

En local : `npm run dev:loclic`. La marque se choisit au build avec `VITE_BRAND=bailly|loclic` (configuration dans `src/brand/brand.ts`, couleurs dans `src/styles/index.css` sous `:root[data-brand="loclic"]`).

## Lancer le projet

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vérification TypeScript + build de production
```

Les données sont générées au premier chargement puis conservées dans le navigateur (localStorage). Le menu du compte (en haut à droite, ou en bas du rail gestionnaire) permet de **changer de rôle**, de passer en **mode sombre** et de **réinitialiser la démo**.

L'horloge de démo est fixée au **4 octobre 2026** pour que l'histoire reste cohérente : Awa Gueye doit son loyer demain, quelques locataires sont en retard, un virement attend confirmation, deux baux arrivent à échéance.

## Visite guidée

| Rôle | Entrée | À essayer |
|---|---|---|
| Accueil | `/` | Survoler les trois rôles : la façade montre ce que chacun verra. |
| Propriétaire | `/proprietaire` | Barre des loyers du mois (chaque segment est un local), façades des biens, graphique 12 mois. |
| | `/proprietaire/biens/prop_kd` | Façade interactive ou **maquette 3D**, aperçu du local au clic. |
| | `/proprietaire/locaux/prop_kd_102` | Fiche local : impayés, échéancier, journal (messages, relances, paiements). |
| | `/proprietaire/nouveau-bien` | **Constructeur 3D** : ajoutez des étages, la maquette monte ; éditez les locaux étage par étage. |
| | `/proprietaire/paiements` | Encaissements par mois, par moyen, export CSV. |
| Gestionnaire | `/gestionnaire` | File « à traiter » triée par priorité (`j` / `k` pour naviguer), actions en contexte. |
| | `/gestionnaire/locaux` | Mur des façades de tous les immeubles, filtres et recherche qui allument les fenêtres. |
| | `/gestionnaire/reclamations` | Réclamations par étape, planification d'intervention. |
| | `/gestionnaire/encaissements` | Recouvrement, relances, confirmation des virements. |
| Locataire | `/locataire` | Prochain loyer, son local, l'intervention prévue, ses quittances. |
| | `/locataire/payer` | Paiement Wave / Orange Money / Free Money / carte simulé, puis quittance. Un numéro finissant par `0000` simule un refus. |
| | `/locataire/echanges` | Conversation avec le gestionnaire, « Signaler un problème ». |

Chaque quittance a une page publique `/quittance/:id`, imprimable en PDF, partageable, avec QR code de vérification.

## Architecture

```
src/
  domain/        types (Unit au centre), libellés, sélecteurs (statuts, file d'attention, stats)
  data/seed.ts   jeu de données déterministe ancré sur l'horloge de démo
  store/         état global (zustand + persistance), toutes les actions métier
  services/payments/
    types.ts         contrat PaymentGateway (initiate / getStatus / cancel)
    mockInTouch.ts   simulation du cycle InTouch dans le navigateur
    httpGateway.ts   client de production vers l'API Bailly
  components/
    facade/        l'élévation d'immeuble, élément signature
    building3d/    maquette React Three Fiber (constructeur et vue 3D)
    journal/       journal du local, réclamations
    money/         barre des loyers, échéancier, graphique, moyens de paiement
    receipt/       la quittance et ses actions
    layout/        les trois coques de navigation (une par rôle)
  features/      pages : lobby, owner, manager, tenant, unit, builder, receipt
```

Stack : Vite, React 19, TypeScript, Tailwind CSS v4, Motion, React Router, Zustand, Three.js / React Three Fiber, Phosphor Icons, polices auto-hébergées (Bricolage Grotesque, Geist, Geist Mono).

- Paiement et intégration InTouch : [`docs/integration-intouch.md`](docs/integration-intouch.md)
- Direction de design (appliquée avec le Taste Skill) : [`DESIGN.md`](DESIGN.md)

## Captures

`node scripts/screenshots.mjs <dossier> "nom|/route|1440|900|light|0"` capture une route avec Playwright (le serveur de dev doit tourner).
