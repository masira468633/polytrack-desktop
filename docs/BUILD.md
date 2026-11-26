# Compilation et développement

## Prérequis

| Élément | Recommandation |
| --- | --- |
| Système | Windows 10 ou 11, x64 |
| Node.js | 20, 22 ou 24 (LTS conseillé) |
| npm | fourni avec Node.js |
| Espace disque | ~2 Go (dépendances + Electron + sorties) |
| Internet | requis pour `npm install` et le premier build |

Vérifier les versions :

```powershell
node --version
npm --version
```

## Installation

```powershell
npm install
```

> **Binaire Electron manquant ?** Certaines politiques npm bloquent les scripts
> d'installation. Si `node_modules\electron\dist\electron.exe` n'existe pas,
> lance manuellement :
>
> ```powershell
> node node_modules\electron\install.js
> ```

## Développement

```powershell
npm start
```

L'application démarre avec le jeu servi sur `http://127.0.0.1:47821/`.
Les DevTools s'ouvrent avec **F12**, le plein écran avec **F11**.

## Icône

L'icône Windows est générée depuis le SVG du jeu :

```powershell
npm run icon
```

Elle est écrite dans `build/icon.png` (512 × 512). `electron-builder` la convertit
automatiquement en `.ico`.

## Construire l'exécutable portable

```powershell
npm run dist
```

Résultat :

```
dist\PolyTrack-0.6.0-portable.exe
```

- Un seul fichier, aucune installation.
- Environ **113 Mo** (Electron + Chromium + le jeu).
- Au premier lancement, l'exécutable s'extrait dans un dossier temporaire puis
  démarre.

## Construire un installateur (optionnel)

```powershell
npm run dist:installer
```

Cela produit `dist\PolyTrack-0.6.0-setup.exe` (assistant d'installation, menu
Démarrer, raccourci bureau). La compression NSIS est **beaucoup plus longue**
que celle du portable, surtout sur un disque lent.

Pour accélérer un installateur de test, on peut réduire la compression :

```powershell
npx electron-builder --win nsis --config.nsis.compression=store
```

## Script tout-en-un

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

Le script installe les dépendances si nécessaire, génère l'icône et construit
le portable.

## Configuration du build

Tout est dans la section `build` de `package.json` :

```jsonc
{
  "build": {
    "appId": "com.polytrack.desktop",
    "productName": "PolyTrack",
    "files": [
      "main.js",
      "server.js",
      "package.json",
      "build/icon.png",
      "game/**/*",
      "!game/.github/**"
    ],
    "asar": true,
    "compression": "maximum",
    "win": {
      "icon": "build/icon.png",
      "target": [{ "target": "portable", "arch": ["x64"] }]
    }
  }
}
```

Points importants :

- `asar: true` : les fichiers sont empaquetés dans `resources/app.asar`.
- `files` : seuls les fichiers utiles sont inclus ; les tests, la documentation
  et `node_modules` de développement ne sont pas embarqués.
- `compression: "maximum"` : réduit la taille de l'exécutable mais allonge le
  build.
- `appId` : identifiant Windows ; le modifier change le dossier de données et
  donc l'emplacement des sauvegardes.

## Intégration continue (GitHub Actions)

Le workflow `.github/workflows/build.yml` compile l'application sur
`windows-latest` à chaque push, pull request ou lancement manuel, puis publie
l'exécutable comme **artifact** téléchargeable depuis l'onglet **Actions**.

Voir [RELEASE.md](RELEASE.md) pour créer une version téléchargeable dans
**Releases**.

## Dépannage

### `npm install` est très lent / échoue

- Vérifier la connexion et l'espace disque.
- Relancer `npm install`.
- En cas d'erreur `TAR_ENTRY_ERROR`, relancer après avoir fermé l'antivirus ou
  après `npm cache clean --force`.
- Si les scripts npm sont bloqués (politique `allowScripts`), exécuter
  manuellement `node node_modules\electron\install.js` et vérifier que `sharp`
  fonctionne :

```powershell
node -e "require('sharp'); console.log('sharp OK')"
```

### `Unable to update lock within the stale threshold`

Cette erreur vient de `proper-lockfile` utilisé par `electron-builder` : sur un
disque très lent (ou avec un antivirus agressif), l'extraction d'Electron bloque
le heartbeat du verrou plus longtemps que le seuil.

Solutions, dans l'ordre :

1. Fermer l'antivirus temporairement, supprimer `dist\`, puis relancer.
2. Utiliser un cache local :

   ```powershell
   $env:ELECTRON_BUILDER_CACHE="$PWD\.cache"
   npm run dist
   ```

3. **Dépannage avancé** (disque vraiment lent) : augmenter le seuil `stale` dans
   les fichiers suivants de `node_modules` :

   ```
   node_modules\app-builder-lib\out\util\toolsetLock.js   : stale: 120000 → 3600000
   node_modules\app-builder-lib\out\util\electronGet.js   : stale: 120000/600000 → 3600000
   ```

   Puis relancer. Ces modifications sont locales et ne doivent pas être
   commitées (`node_modules` est ignoré par Git).

### `Windows a protégé votre PC` / SmartScreen

L'exécutable n'est pas signé. Cliquer sur **Informations complémentaires →
Exécuter quand même**. Pour supprimer l'avertissement, il faut un certificat de
signature de code (payant) et configurer `CSC_LINK` / `CSC_KEY_PASSWORD`.

### Le build réussit mais l'application ne démarre pas

- Lancer l'exécutable depuis `dist\win-unpacked\PolyTrack.exe` pour voir la
  console.
- Vérifier que le port 47821 est libre.
- Tester le serveur empaqueté :

```powershell
powershell -ExecutionPolicy Bypass -File .\test\verify-exe.ps1 `
  -Exe ".\dist\PolyTrack-0.6.0-portable.exe"
```

### Le PDF / la documentation ne s'affiche pas

Les liens du README sont relatifs. Les consulter depuis la racine du dépôt
(GitHub les résout automatiquement) ou depuis un clone local avec un visualiseur
Markdown.
