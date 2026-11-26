# FAQ

## Général

### Qu'est-ce que ce projet ?

Une application **Windows** qui permet de jouer à **PolyTrack 0.6.0** sans
navigateur, sous la forme d'un `.exe` portable. Le jeu web d'origine est embarqué
dans Electron.

### Est-ce la version officielle de PolyTrack ?

Non. Ce projet n'est **pas affilié à Kodub**. C'est un emballage de bureau de la
version web open-source 0.6.0. Le jeu et ses ressources appartiennent à leurs
auteurs (voir [CREDITS.md](../CREDITS.md)).

### Le jeu est-il complet ?

Oui : circuits officiels Summer/Winter/Desert, circuits communautaires inclus,
éditeur, garage, classements et multijoueur expérimental.

### Faut-il installer quelque chose ?

Non. Le fichier `PolyTrack-0.6.0-portable.exe` est autonome : double-clic, et le
jeu démarre.

### Pourquoi l'exécutable fait-il environ 113 Mo ?

Parce qu'il contient **Electron + Chromium + Node.js + le jeu** (modèles 3D,
audio, circuits). C'est le prix d'une application de bureau autonome.

## Données et sauvegardes

### Où sont enregistrés les records et les réglages ?

Dans :

```
%APPDATA%\PolyTrack
```

### Comment réinitialiser le jeu ?

Fermer l'application, puis supprimer le dossier `%APPDATA%\PolyTrack`.

### Où sont mes circuits personnalisés ?

Ils sont stockés par le jeu dans `%APPDATA%\PolyTrack`. L'éditeur permet aussi de
les **exporter** en fichiers `.track` et de les **importer**.

### Puis-je déplacer le `.exe` ?

Oui. Le fichier est portable ; les sauvegardes restent dans `%APPDATA%\PolyTrack`
et ne dépendent pas de l'emplacement de l'exécutable.

### Une mise à jour efface-t-elle mes données ?

Non, tant que l'identifiant de l'application (`appId`) et le nom du produit ne
changent pas. Il suffit de remplacer l'ancien `.exe` par le nouveau.

### Comment désinstaller complètement ?

1. Supprimer l'exécutable.
2. Supprimer `%APPDATA%\PolyTrack` (facultatif, efface les données).

## Fonctionnement

### Faut-il Internet ?

Le jeu et les circuits inclus fonctionnent **hors ligne**. Internet est
nécessaire pour :

- les **classements** et le profil en ligne ;
- le **multijoueur** ;
- les circuits communautaires qui ne seraient pas déjà inclus.

### Le multijoueur fonctionne-t-il ?

Oui, via les serveurs publics de PolyTrack
(`pt0-6-0b1-mp-backend.htmlpolytrack.workers.dev`). Ce service est tiers et peut
être indisponible ou évoluer sans préavis.

### Pourquoi le port 47821 ?

Le jeu est servi en local pour que les Web Workers, le WASM et les `fetch`
fonctionnent. Le port est **fixe** car les sauvegardes du navigateur sont liées à
l'origine (`http://127.0.0.1:47821`). Si le port est occupé, l'application essaie
les ports 47822 à 47851.

### Puis-je changer la résolution ou passer en plein écran ?

Oui : **F11** pour le plein écran, et les réglages du jeu pour l'affichage.
La fenêtre est redimensionnable.

### Y a-t-il un support manette ?

Les contrôles officiels sont le clavier (flèches/WASD). Le jeu d'origine ne
documente pas de support manette natif.

### Pourquoi le jeu met-il quelques secondes à démarrer ?

Electron doit lancer Chromium, charger les modèles, compiler le WASM et
initialiser l'audio. Sur un disque lent, le premier lancement du `.exe` portable
peut prendre plus de temps (extraction dans un dossier temporaire).

## Sécurité et antivirus

### Windows affiche « Windows a protégé votre PC »

L'exécutable n'est **pas signé numériquement**. Cliquer sur
**Informations complémentaires → Exécuter quand même**. Le code source est
public : tu peux compiler toi-même pour vérifier.

### Mon antivirus signale le fichier

Les applications Electron non signées déclenchent parfois des faux positifs.
Vérifie le fichier (taille, SHA-256 publié dans la Release), ou compile-le
toi-même avec `npm run dist`.

### L'application ouvre-t-elle un port réseau dangereux ?

Le serveur écoute uniquement sur `127.0.0.1` (localhost), pas sur le réseau
local. Il sert des fichiers statiques du jeu et refuse les traversées de
répertoire.

## Développement

### Comment compiler moi-même ?

Voir [BUILD.md](BUILD.md) :

```powershell
npm install
npm run dist
```

### Puis-je l'adapter à Linux ou macOS ?

Oui, la structure Electron est portable. Il faudrait ajouter les cibles
`linux`/`mac` dans `package.json`, tester les chemins et fournir des icônes
adaptées. Aucun binaire n'est fourni pour ces systèmes.

### Puis-je redistribuer l'exécutable ?

Pas sans vérifier les droits. Le jeu d'origine n'a pas de licence explicite dans
le dépôt source. Lis [NOTICE.md](../NOTICE.md) avant toute publication.

### Le projet est-il maintenu ?

C'est un projet communautaire, fourni tel quel. Les corrections bienvenues sont
décrites dans [CONTRIBUTING.md](../CONTRIBUTING.md).
