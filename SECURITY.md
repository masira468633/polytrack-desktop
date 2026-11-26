# Politique de sécurité

## Versions prises en charge

| Version | Support |
| --- | --- |
| 0.6.0 (édition bureau) | ✅ |
| Versions antérieures | ❌ |

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique contenant des détails exploitables.

1. Utilise l'onglet **[Security](../../security)** du dépôt puis
   **Report a vulnerability** (GitHub Private Vulnerability Reporting), si
   l'option est activée.
2. À défaut, contacte les mainteneurs du dépôt en privé via leur profil GitHub.

Décris :

- la version de l'application et de Windows ;
- les étapes de reproduction ;
- l'impact potentiel ;
- une preuve de concept minimale, si possible ;
- les correctifs que tu suggères.

## Périmètre

Ce dépôt ne maintient pas le jeu PolyTrack lui-même. Les vulnérabilités du jeu
d'origine, de son moteur physique, de son backend ou de ses serveurs
multijoueur doivent être signalées aux auteurs de PolyTrack.

Sont concernés ici :

- le serveur HTTP local (`server.js`) ;
- l'intégration Electron (`main.js`) ;
- l'empaquetage et les scripts de build ;
- la documentation et les workflows.

## Bonnes pratiques

- Télécharge uniquement les exécutables depuis la page **Releases** de ce dépôt.
- Ne désactive pas l'isolation Electron sans raison.
- Garde Windows et les pilotes graphiques à jour.

## Divulgation

Nous ferons notre possible pour accuser réception rapidement et publier un
correctif dans une nouvelle version. Merci de laisser un délai raisonnable avant
toute divulgation publique.
