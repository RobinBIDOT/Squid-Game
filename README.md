# Squid Game Race

## Exercice
Mon travail sur ce projet :
- **Lecture et Compréhension de Code**: Explorer et comprendre le fonctionnement interne du jeu.
- **Commentaires de Code**: Pratiquer l'ajout de commentaires pour clarifier la logique et les fonctionnalités du code.
- **Découverte de Nouvelles Bibliothèques**: Se familiariser avec les bibliothèques utilisées, notamment pico.js, camvas.js, GSAP, et Three.js, et découvrir comment elles contribuent au développement de jeux interactifs.

## Présentation
Squid Game Race est un jeu interactif inspiré par la série "Squid Game". Ce jeu utilise la reconnaissance faciale et des animations 3D pour créer une expérience immersive où le joueur doit éviter d'être vu par la "poupée" tout en se déplaçant vers l'avant pour atteindre l'objectif.

## Fonctionnalités
- **Reconnaissance Faciale**: Utilise la webcam pour détecter les mouvements de la tête du joueur.
- **Interactivité**: Le joueur doit bouger sa tête pour avancer dans le jeu sans être détecté par la poupée.
- **Animations 3D**: Intègre des modèles et animations 3D pour un rendu visuel attractif.
- **Son Immersif**: Comprend des effets sonores pour augmenter l'immersion.
- **Interface Utilisateur**: Affiche le temps, la distance parcourue, et le pourcentage de mouvement.

## Bibliothèques Utilisées
- **pico.js**: Pour la reconnaissance faciale.
- **camvas.js**: Gestion de la webcam.
- **GSAP (GreenSock Animation Platform)**: Pour les animations fluides.
- **Three.js**: Pour le rendu 3D.
- **GLTFLoader & OrbitControls (Three.js)**: Pour le chargement et la manipulation des modèles 3D.

## Langages Utilisés
- **HTML**: Structure de la page web et intégration des bibliothèques.
- **CSS**: Styles pour l'interface utilisateur.
- **JavaScript**: Logique du jeu, gestion de la webcam, et animations.

## Comment Jouer
1. Autorisez l'accès à votre webcam lorsque vous êtes invité.
2. Lorsque la poupée ne vous regarde pas, bougez la tête pour avancer.
3. Arrêtez tout mouvement lorsque la poupée vous regarde.
4. Atteignez l'objectif avant la fin du temps imparti sans être détecté pour gagner.

## Remarques
- Le jeu ne fonctionne pas sur iOS Safari.
- Assurez-vous d'avoir une bonne luminosité pour une meilleure reconnaissance faciale.

## Crédits
- Modèle 3D de la poupée et effets sonores utilisés sous licence Creative Commons.
