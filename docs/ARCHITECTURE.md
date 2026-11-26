# Architecture

Ce document explique comment l'application de bureau fonctionne, pourquoi ces
choix ont été faits et où intervenir pour modifier le comportement.

## Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────┐
│                     Processus principal Electron             │
│                                                              │
│  main.js                                                     │
│   ├─ démarre server.js ──► http://127.0.0.1:47821/           │
│   ├─ configure les en-têtes CORS pour vps.kodub.com           │
│   ├─ crée la BrowserWindow                                   │
│   └─ gère plein écran, liens externes, permissions, erreurs   │
│                                                              │
│  server.js                                                   │
│   └─ sert game/ (MIME, Range, asar, anti-traversée)           │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP local
┌───────────────────────────▼──────────────────────────────────┐
│                  Processus de rendu Chromium                 │
│                                                              │
│  game/index.html + bundles                                  │
│   ├─ WebGL2 (rendu 3D)                                      │
│   ├─ Web Worker (simulation_worker.bundle.js)                │
│   ├─ WebAssembly (polytrack_physics.wasm)                    │
│   ├─ Audio, modèles GLB, circuits .track                     │
│   ├─ localStorage / IndexedDB (sauvegardes)                  │
│   └─ API en ligne + WebSocket multijoueur                    │
└──────────────────────────────────────────────────────────────┘
```

## Pourquoi un serveur HTTP local ?

Charger le jeu directement avec `file://` pose plusieurs problèmes :

- les **Web Workers** ne peuvent pas être créés depuis certaines origines
  `file://` ;
- `fetch()` et la compilation **WebAssembly** peuvent être bloqués par les
  règles CORS ;
- les chemins relatifs et les requêtes `Range` sur l'audio sont moins fiables.

Servir le jeu depuis `http://127.0.0.1` reproduit les conditions d'un vrai site
web, sans dépendre d'Internet et sans ouvrir le port au réseau local
(écoute uniquement sur `127.0.0.1`).

## Port fixe et sauvegardes

L'application utilise le port **47821** en priorité, puis 47822 à 47851 si le
port est occupé.

Ce port est **fixe volontairement** : `localStorage` et `IndexedDB` sont isolés
par origine (`http://127.0.0.1:PORT`). Un port aléatoire à chaque lancement
ferait perdre les sauvegardes, records et circuits personnalisés.

Les données sont stockées par Electron dans :

```
%APPDATA%\PolyTrack
```

## Serveur statique (`server.js`)

- écoute sur `127.0.0.1` uniquement ;
- accepte `GET` et `HEAD`, répond `405` sinon ;
- résout les chemins dans `game/` et refuse toute tentative de traversée
  (`../`) ;
- renvoie les bons types MIME : `application/wasm`, `model/gltf-binary`,
  `audio/ogg`, `application/octet-stream` pour les `.track`, etc. ;
- gère les requêtes `Range` (`206 Partial Content`) pour l'audio ;
- renvoie `404` proprement pour les ressources absentes attendues par le jeu ;
- désactive le cache (`Cache-Control: no-cache`) pour éviter les fichiers
  périmés après une mise à jour.

En production, les fichiers sont lus depuis `app.asar` via le support asar
d'Electron ; `fs.stat` et `fs.createReadStream` fonctionnent de façon
transparente.

## Fenêtre et intégration Electron (`main.js`)

- **Isolation** : `contextIsolation: true`, `sandbox: true`,
  `nodeIntegration: false`. La page n'a aucun accès à Node.js.
- **Permissions** : toutes les demandes sont refusées sauf `fullscreen` et
  `pointerLock`.
- **Liens externes** : `window.open` et les navigations hors du serveur local
  sont interceptés et ouverts dans le navigateur par défaut via
  `shell.openExternal`.
- **Plein écran** : F11 bascule le plein écran natif ; F12 ouvre les DevTools.
- **Instance unique** : un second lancement ramène la fenêtre existante au premier
  plan.
- **Écran éveillé** : `powerSaveBlocker` empêche la mise en veille de l'écran
  pendant le jeu.
- **Robustesse** : une erreur de chargement ou un crash du renderer affiche une
  boîte de dialogue avec option de redémarrage.
- **Audio** : `--autoplay-policy=no-user-gesture-required` autorise la musique et
  les sons sans clic préalable.

## Compatibilité avec l'API en ligne

L'API officielle `https://vps.kodub.com` n'accepte que l'origine
`https://www.kodub.com` (vérifié : les autres origines reçoivent `403` et aucun
en-tête CORS). Comme le jeu est servi localement, les classements et le profil
seraient bloqués par le navigateur.

La solution est strictement limitée à `https://vps.kodub.com/*` :

1. `onBeforeSendHeaders` remplace `Origin` par `https://www.kodub.com` et ajuste
   `Referer` ;
2. `onHeadersReceived` remplace l'en-tête `Access-Control-Allow-Origin` de la
   réponse par l'origine locale réelle et autorise les credentials.

Cela permet au navigateur d'accepter la réponse. Aucun autre domaine n'est
modifié. Si l'API change ses règles, il suffit d'adapter ces deux handlers dans
`main.js`.

Le **multijoueur** utilise `wss://pt0-6-0b1-mp-backend.htmlpolytrack.workers.dev`
et accepte n'importe quelle origine : aucune adaptation n'est nécessaire.

## Données et persistance

| Donnée | Emplacement |
| --- | --- |
| Réglages, records, profil local | `%APPDATA%\PolyTrack` (localStorage/IndexedDB) |
| Circuits personnalisés | idem (stockage du jeu) |
| Exécutable portable | fichier unique, aucun état à côté |
| Cache de build | `.cache/` (ignoré par Git) |

Mettre à jour l'application ne supprime pas ces données : l'identifiant
`com.polytrack.desktop` et le dossier de données restent les mêmes.

## Empaquetage

`electron-builder` produit une cible **portable** :

- l'application est empaquetée dans `app.asar` (main.js, server.js, game/,
  package.json, build/icon.png) ;
- l'exécutable téléchargeable contient Electron + l'application ;
- l'icône est générée depuis `game/images/icon.svg` via Sharp.

La configuration se trouve dans la section `build` de `package.json`.

## Tests

- `test/smoke.js` : charge le jeu comme l'application réelle, vérifie WebGL2,
  le menu, la boucle de rendu, les sauvegardes, les workers et les erreurs
  console/réseau.
- `test/gameplay.js` : traverse l'interface (Play → Official tracks → Summer 1),
  lance une course et vérifie le chrono, le compteur de vitesse et les workers.
- `test/verify-exe.ps1` : lance l'exécutable empaqueté et teste son serveur
  (index, WASM, GLB, audio `Range`, circuits).

Les tests désactivent la détection d'occlusion Windows
(`CalculateNativeWinOcclusion`) pour rester fiables dans un environnement
automatisé sans écran interactif.

## Limites connues

- Windows uniquement pour l'instant (la structure est portable vers macOS/Linux).
- L'exécutable n'est pas signé : SmartScreen peut afficher un avertissement.
- Les fonctions en ligne dépendent des serveurs publics de PolyTrack.
- L'API et le backend peuvent évoluer indépendamment de ce dépôt.
- Les droits sur le jeu d'origine ne sont pas explicites : voir
  [NOTICE.md](../NOTICE.md).
