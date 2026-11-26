# Journal des modifications

Toutes les évolutions notables de l'application de bureau sont documentées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/) et le
versionnage suit [SemVer](https://semver.org/lang/fr/).

## [0.6.0] — 2026-11-26

Première édition bureau, basée sur PolyTrack web **0.6.0**.

### Ajouté

- Application Electron portable Windows (`PolyTrack-0.6.0-portable.exe`).
- Serveur HTTP local sur le port 47821 (ports de secours 47822–47851), avec types
  MIME corrects, support des requêtes `Range` et protection contre les traversées
  de répertoire.
- Sauvegardes persistantes dans `%APPDATA%\PolyTrack`.
- Icône Windows générée depuis `game/images/icon.svg`.
- Plein écran F11, DevTools F12, ouverture des liens externes dans le navigateur.
- Audio autorisé au démarrage (`autoplay-policy=no-user-gesture-required`).
- Compatibilité avec l'API officielle PolyTrack : en-tête `Origin` attendu pour
  `vps.kodub.com` et réécriture CORS vers l'origine locale.
- Script de build `build.ps1`, tests `smoke`/`gameplay` et vérification de
  l'exécutable empaqueté.
- Workflow GitHub Actions pour compiler l'exécutable.
- Documentation complète (README, architecture, build, FAQ, release, crédits).

### Corrigé

- Blocage CORS des classements et du profil en ligne depuis l'origine locale.
- Blocage de la lecture audio sans interaction utilisateur.
- Perte potentielle des sauvegardes si le port changeait (port désormais fixe).
- Accès Node.js et navigation non contrôlée dans la fenêtre du jeu.

### Vérifié

- WebGL2 actif, boucle de rendu ~60 FPS.
- Course complète : 129 km/h, chrono 00:03.831, 2 workers de simulation.
- Exécutable empaqueté : WASM, GLB, audio `Range` et circuits `.track` servis
  correctement, fenêtre `PolyTrack`, aucune erreur console/réseau.

### Notes

- L'exécutable n'est pas signé numériquement : SmartScreen peut afficher un
  avertissement.
- Aucune licence explicite n'est fournie pour le jeu d'origine ; voir
  [NOTICE.md](NOTICE.md).
