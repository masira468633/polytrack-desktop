# Publier une version (Release)

GitHub limite la taille d'un fichier commité à **100 Mo** (avertissement dès
50 Mo). L'exécutable fait environ **113 Mo** : il ne doit **jamais** être ajouté
au dépôt. Il doit être joint à une **Release**, qui accepte des fichiers jusqu'à
2 Go.

## 1. Préparer la version

1. Met à jour le numéro de version dans `package.json` :

   ```json
   "version": "0.6.0"
   ```

2. Ajoute une entrée en haut de [CHANGELOG.md](../CHANGELOG.md).
3. Vérifie que la documentation est à jour (README, FAQ, BUILD).
4. Lance les tests :

   ```powershell
   npm run test:smoke
   npm run test:gameplay
   ```

5. Construis et vérifie l'exécutable :

   ```powershell
   npm run dist
   powershell -ExecutionPolicy Bypass -File .\test\verify-exe.ps1 `
     -Exe ".\dist\PolyTrack-0.6.0-portable.exe"
   ```

6. Calcule l'empreinte SHA-256 à publier :

   ```powershell
   Get-FileHash ".\dist\PolyTrack-0.6.0-portable.exe" -Algorithm SHA256
   ```

## 2. Commiter et pousser

```powershell
git add .
git commit -m "chore(release): 0.6.0"
git push
```

## 3. Créer la Release

### Option A — interface GitHub (recommandé)

1. Ouvre l'onglet **Releases** du dépôt → **Draft a new release**.
2. **Choose a tag** : `v0.6.0` (créer le tag sur `main`).
3. **Release title** : `PolyTrack Desktop 0.6.0`.
4. Décris les changements (copie la section du CHANGELOG) et ajoute :
   - la configuration requise (Windows 10/11 x64) ;
   - l'avertissement SmartScreen (fichier non signé) ;
   - le SHA-256 du fichier ;
   - les crédits et le lien vers `NOTICE.md`.
5. Joins le fichier :
   `dist\PolyTrack-0.6.0-portable.exe`
6. Clique sur **Publish release**.

Le lien `../../releases/latest` du README pointera automatiquement vers cette
version.

### Option B — GitHub CLI

```powershell
gh release create v0.6.0 ".\dist\PolyTrack-0.6.0-portable.exe" `
  --title "PolyTrack Desktop 0.6.0" `
  --notes "Application Windows portable de PolyTrack 0.6.0. Fichier non signe : SmartScreen peut afficher un avertissement. Voir NOTICE.md."
```

Pour un texte plus long, écris-le dans un fichier `RELEASE_NOTES.md` puis utilise
`--notes-file RELEASE_NOTES.md`.

### Option C — artifact de GitHub Actions

Le workflow `.github/workflows/build.yml` compile l'application à chaque push.
Pour récupérer l'exécutable :

1. Onglet **Actions** → dernier workflow **Build Windows app** ;
2. section **Artifacts** → télécharger `PolyTrack-windows` ;
3. dézipper et joindre le `.exe` à une Release.

## 4. Notes de version suggérées

```markdown
## PolyTrack Desktop 0.6.0

Application Windows portable de PolyTrack 0.6.0.

### Téléchargement
- `PolyTrack-0.6.0-portable.exe` (Windows 10/11 x64)

### Vérification
SHA-256 : `<hash>`

### Notes
- Fichier non signé : Windows SmartScreen peut afficher un avertissement
  (« Informations complémentaires » → « Exécuter quand même »).
- Sauvegardes dans `%APPDATA%\PolyTrack`.
- Ce projet n'est pas affilié à Kodub. Voir `NOTICE.md`.
```

## 5. Checklist avant publication

- [ ] `package.json` et `CHANGELOG.md` ont la même version.
- [ ] Les tests passent.
- [ ] L'exécutable a été vérifié avec `verify-exe.ps1`.
- [ ] Le `.exe` n'est **pas** commité (`git status` propre, `dist/` ignoré).
- [ ] La Release contient le `.exe`.
- [ ] Le SHA-256 est indiqué.
- [ ] L'avertissement SmartScreen est présent.
- [ ] Les droits sur le jeu ont été vérifiés (voir `NOTICE.md`).
- [ ] Aucun secret, token ou chemin personnel n'est présent dans le dépôt.

## 6. Mises à jour suivantes

Pour une nouvelle version :

1. incrémenter la version (SemVer) ;
2. mettre à jour le CHANGELOG ;
3. refaire les tests et le build ;
4. créer un nouveau tag (`v0.6.1`, `v0.7.0`, …) et une nouvelle Release.

Les sauvegardes des joueurs sont conservées tant que `appId` et `productName`
restent identiques.
