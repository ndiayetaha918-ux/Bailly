# Paiement : intégrer InTouch

Le MVP simule le paiement dans le navigateur, mais le front est déjà écrit contre le contrat de production. Brancher InTouch consiste à écrire la partie serveur décrite ici et à passer `VITE_PAYMENT_GATEWAY=http`.

## Principe

Le navigateur ne parle **jamais** directement à InTouch : les identifiants marchands restent côté serveur. Le front appelle l'API Bailly, qui appelle InTouch et reçoit son callback.

```
Locataire            App Bailly             API Bailly                 InTouch
   |  Payer 305 000      |                       |                         |
   |-------------------->| POST /payments        |                         |
   |                     |---------------------->| demande de collecte     |
   |                     |                       |------------------------>|
   |                     |  { transactionId,     |   push sur le téléphone |
   |                     |    status: PENDING }  |<------------------------|
   |  "Validez sur votre |<----------------------|                         |
   |   téléphone"        |                       |                         |
   |  (valide sur Wave)  |                       |      callback statut    |
   |                     |                       |<------------------------|
   |                     | GET /payments/:id     |  maj paiement + échéance|
   |                     |---------------------->|  + quittance            |
   |  Quittance          |<----- SUCCESSFUL -----|                         |
```

## Contrat côté front (déjà en place)

`src/services/payments/types.ts`

```ts
interface PaymentGateway {
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>; // -> PENDING + nextAction
  getStatus(transactionId: string): Promise<PaymentStatusResult>;        // -> PENDING | SUCCESSFUL | FAILED
  cancel?(transactionId: string): Promise<void>;
}
```

- `MockInTouchGateway` (par défaut) reproduit le cycle : `PENDING` puis `SUCCESSFUL` après quelques secondes. Un numéro finissant par `0000` échoue (solde insuffisant), par `1111` expire.
- `HttpGateway` appelle l'API Bailly : `POST /payments` (avec en-tête `Idempotency-Key`), `GET /payments/:id`, `POST /payments/:id/cancel`.

Variables : `VITE_PAYMENT_GATEWAY=mock|http`, `VITE_API_URL=/api`.

Le store (`src/store/store.ts`, action `startPayment`) gère l'état du paiement (`initiated → pending → succeeded | failed | cancelled`), interroge le statut, puis appelle `settle()` qui met à jour l'échéance, émet la quittance quand le montant est complet et journalise l'événement sur le local. Côté serveur, c'est cette même logique qui doit s'exécuter à réception du callback.

## À construire côté serveur

1. **`POST /payments`**
   - Vérifie que l'échéance appartient au locataire connecté et que le montant ne dépasse pas le reste dû.
   - Crée le paiement en base (`initiated`), avec la clé d'idempotence reçue.
   - Appelle l'API de collecte InTouch avec le service correspondant au moyen choisi (Wave, Orange Money, Free Money, carte), le montant, le numéro du payeur, la référence Bailly et l'URL de callback. Les noms exacts des services, des champs et des endpoints sont ceux de la documentation marchande fournie par InTouch avec le contrat.
   - Enregistre l'identifiant de transaction InTouch, passe le paiement à `pending`, renvoie `{ transactionId, status: "PENDING", nextAction }`.

2. **Callback InTouch** (`POST /webhooks/intouch`)
   - Authentifie l'appel selon le mécanisme prévu par InTouch (signature, secret partagé ou liste d'IP) et rejette le reste.
   - Retrouve le paiement par référence / identifiant de transaction ; traitement **idempotent** (un callback reçu deux fois ne crée pas deux quittances).
   - Succès : paiement `succeeded`, échéance créditée, quittance émise si l'échéance est soldée (numéro séquentiel, code de vérification), événement sur le journal du local, notification au locataire et au gestionnaire.
   - Échec : paiement `failed` avec la raison lisible.

3. **`GET /payments/:id`** : renvoie l'état connu en base. Si aucun callback n'est arrivé après un délai, le serveur peut interroger le statut de la transaction chez InTouch avant de répondre.

4. **Rapprochement** : tâche quotidienne qui compare les transactions InTouch du jour aux paiements Bailly et signale les écarts.

## Points d'attention

- Seul le serveur décide qu'un paiement est réussi : le front n'émet jamais de quittance de lui-même en production.
- Montants en XOF, entiers (pas de centimes).
- Conserver la réponse brute d'InTouch sur chaque paiement pour l'audit.
- Les paiements en espèces et virements passent par `recordManualPayment` / `confirmTransfer` et produisent la même quittance, avec l'auteur de la saisie.
