# Contribuer

Merci de t'intéresser à PolyTrack Desktop ! Ce guide explique comment proposer un
changement dans de bonnes conditions.

## Code de conduite

En participant, tu acceptes le [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Sois
respectueux, patient et constructif.

## Signaler un bug

1. Vérifie que le problème n'est pas déjà signalé dans les
   [issues](../../issues).
2. Ouvre une issue avec le modèle **Bug report**.
3. Indique :
   - la version de Windows (10/11, build) ;
   - la version de l'application (fichier `package.json` ou nom du `.exe`) ;
   - les étapes exactes pour reproduire ;
   - le comportement attendu et observé ;
   - une capture d'écran ou un extrait de logs si possible.

Pour les problèmes liés uniquement au jeu d'origine (physique, circuits,
multijoueur officiel), contacte plutôt les auteurs de PolyTrack : ce dépôt ne
contrôle pas le jeu web.

## Proposer une fonctionnalité

Ouvre une issue avec le modèle **Feature request** et explique :

- le besoin ou le problème ;
- la solution proposée ;
- les alternatives envisagées ;
- l'impact sur les sauvegardes ou la compatibilité Windows.

## Développement

```powershell
# 1. Fork puis clone
git clone https://github.com/TON-COMPTE/polytrack-desktop.git
cd polytrack-desktop

# 2. Installer
npm install

# 3. Lancer en mode développement
npm start

# 4. Tests
npm run test:smoke
npm run test:gameplay
```

### Règles importantes

- **Ne modifie pas `game/`** : c'est une copie de référence de la version web
  0.6.0. Les corrections doivent être faites dans l'emballage (`main.js`,
  `server.js`, `scripts/`, `test/`, `docs/`).
- Ne commite **jamais** `node_modules/`, `dist/`, `.cache/` ni un `.exe`.
- Ne commite aucun secret, token ou chemin personnel.
- Garde la compatibilité **Windows 10/11 x64**.
- Respecte le style existant : JavaScript CommonJS, 2 espaces, guillemets
  simples, points-virgules.

### Tests avant une pull request

```powershell
node --check main.js
node --check server.js
npm run test:smoke
npm run test:gameplay
```

Si tu touches au packaging, construis aussi l'exécutable :

```powershell
npm run dist
powershell -ExecutionPolicy Bypass -File .\test\verify-exe.ps1 `
  -Exe ".\dist\PolyTrack-0.6.0-portable.exe"
```

### Pull request

1. Crée une branche descriptive : `fix/plein-ecran`, `docs/faq`, etc.
2. Fais des commits clairs, par exemple :
   - `fix: conserve le plein écran après un changement de piste`
   - `docs: précise l'emplacement des sauvegardes`
3. Remplis le modèle de pull request.
4. Décris ce qui a été testé et sur quel système.

## Documentation

Les fichiers Markdown sont en français. Si tu ajoutes une section, mets à jour le
sommaire du `README.md` et vérifie les liens relatifs.

## Sécurité

Ne divulgue pas publiquement une vulnérabilité exploitable : suis
[SECURITY.md](SECURITY.md).

## Licence des contributions

En proposant une contribution sur le **code d'emballage**, tu acceptes qu'elle
soit distribuée avec ce dépôt. Tu conserves la paternité de ton travail. Les
contributions ne doivent pas introduire de contenu dont tu ne détiens pas les
droits. Voir [CREDITS.md](CREDITS.md) et [NOTICE.md](NOTICE.md).
