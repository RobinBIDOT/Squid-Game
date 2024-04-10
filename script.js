/* Reconnaissance faciale à partir de : https://nenadmarkus.com/p/picojs-intro/demo/
   Ce script gère le jeu 'Squid Game race' avec une interface utilisateur,
   un traitement de webcam pour la reconnaissance faciale, et des interactions basées
   sur les mouvements du joueur.
*/
/* Face recognition from : https://nenadmarkus.com/p/picojs-intro/demo/ */

// Nettoyage de la console
console.clear();

// Initialisation des variables principales
let distance = 0;
let isWatching = true;
let pos = {
  x: -1,
  y: -1,
};
let prev_pos = {
  x: 0,
  y: 0,
};
// Sélection des éléments du DOM
let distanceSinceWatching = 0;
const elDistance = document.querySelector(".distance .total");
const elStart = document.querySelector(".start");
const elHowTo = document.querySelector(".howto");
const elGame = document.querySelector(".game");
const elContainer = document.querySelector(".container");
const elTime = document.querySelector(".timer .time");
const elMovement = document.querySelector(".movement");
const elReplay1 = document.querySelector(".replay1");
const elReplay2 = document.querySelector(".replay2");
const elDead = document.querySelector(".dead");
const elWin = document.querySelector(".win");
const audioDoll = new Audio(
  "https://assets.codepen.io/127738/squid-game-sound.mp3"
);
const audioDollDuration = 5.433469;
const shotGun = new Audio("https://assets.codepen.io/127738/shotgun.mp3");
shotGun.volume = 0.2;
const sigh = new Audio("https://assets.codepen.io/127738/sigh.mp3");

const MAX_TIME = 60;
const FINISH_DISTANCE = 100;
const IN_GAME_MAX_DISTANCE = 4000;
const MAX_MOVEMENT = 180;

let playing = false;

var mycamvas;

/**
 * Initialise le jeu avec la reconnaissance faciale et les paramètres du jeu.
 */
function init() {
  // Éviter la réinitialisation si le jeu a déjà été initialisé
  var initialized = false;
  if (initialized) return;

  /*
    (1) Préparation du détecteur de visage de pico.js
  */
  // Utilisation des détections des 5 dernières images pour une reconnaissance stable
  var update_memory = pico.instantiate_detection_memory(5);
  // Fonction de classification par défaut pour pico.js
  var facefinder_classify_region = function (r, c, s, pixels, ldim) {
    return -1.0;
  };
  // Chargement du modèle de reconnaissance faciale depuis une source externe
  var cascadeurl =
    "https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder";
  fetch(cascadeurl).then(function (response) {
    response.arrayBuffer().then(function (buffer) {
      var bytes = new Int8Array(buffer);
      facefinder_classify_region = pico.unpack_cascade(bytes);
      console.log("* cascade chargée");
    });
  });
  /*
    (2) Obtention du contexte de dessin sur le canvas et définition d'une fonction
    pour transformer une image RGBA en niveaux de gris
  */
  var ctx = document.querySelector(".webcam").getContext("2d");
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#d7327a";
  // Fonction pour convertir une image RGBA en niveaux de gris
  function rgba_to_grayscale(rgba, nrows, ncols) {
    var gray = new Uint8Array(nrows * ncols);
    for (var r = 0; r < nrows; ++r)
      for (var c = 0; c < ncols; ++c)
        gray[r * ncols + c] =
          (2 * rgba[r * 4 * ncols + 4 * c + 0] +
            7 * rgba[r * 4 * ncols + 4 * c + 1] +
            1 * rgba[r * 4 * ncols + 4 * c + 2]) /
          10;
    return gray;
  }
  /*
    (3) Cette fonction est appelée chaque fois qu'une image vidéo devient disponible
  */
  var processfn = function (video, dt) {
    // Dessiner l'image vidéo sur l'élément canvas et extraire les données des pixels RGBA
    ctx.drawImage(video, 0, 0);
    var rgba = ctx.getImageData(0, 0, 640, 480).data;

    // Préparation des données pour l'exécution du modèle de cascade
    var image = {
      pixels: rgba_to_grayscale(rgba, 480, 640),
      nrows: 480,
      ncols: 640,
      ldim: 640,
    };
    var params = {
      shiftfactor: 0.1, // Déplacer la fenêtre de détection de 10% de sa taille
      minsize: 100, // Taille minimum d'un visage
      maxsize: 1000, // Taille maximum d'un visage
      scalefactor: 1.1, // Pour le traitement multi-échelle
    };

    // Exécution de la cascade sur l'image et regroupement des détections obtenues
    var dets = pico.run_cascade(image, facefinder_classify_region, params);
    dets = update_memory(dets);
    dets = pico.cluster_detections(dets, 0.2); // Seuil IoU à 0.2
    // Dessin des détections de visages sur le canvas
    if (dets.length) {
      const det = dets[0]; // Prendre la détection la plus forte

      // Vérifier le score de la détection - si c'est supérieur au seuil, dessiner le cercle
      if (det[3] > 50.0) {
        // 50.0 est un seuil empirique
        // Mise à jour des positions précédentes et actuelles du visage
        prev_pos.x = pos.x;
        prev_pos.y = pos.y;
        pos.x = det[1]; // Coordonnée x du visage
        pos.y = det[0]; // Coordonnée y du visage

        // Calculer la distance parcourue entre les deux dernières détections
        let _dist = Math.hypot(pos.x - prev_pos.x, pos.y - prev_pos.y)*1.2;

        // Réinitialiser la distance si c'est la première détection
        if (prev_pos.x === -1) {
          _dist = 0;
        }

        // Si le jeu est dans l'état "non surveillé", augmenter la distance parcourue
        if (!isWatching) {
          distance += _dist;

          // Vérifier si le joueur a atteint la fin
          if (distance > IN_GAME_MAX_DISTANCE) {
            reachedEnd(); // Fonction appelée lorsque l'utilisateur atteint la fin
          }
        } else {
          // Sinon, accumuler la distance depuis que la poupée observe
          distanceSinceWatching += _dist;
          // Si la distance dépasse le mouvement maximum autorisé, le joueur est éliminé
          if (distanceSinceWatching > MAX_MOVEMENT) {
            dead(); // Fonction appelée lorsque le joueur est éliminé
          }
        }
        // Mise à jour de l'affichage de la distance dans l'interface utilisateur
        let formattedDistance =
          "" + Math.round((distance / IN_GAME_MAX_DISTANCE) * FINISH_DISTANCE);
        if (formattedDistance.length === 1) {
          formattedDistance = "00" + formattedDistance;
        } else if (formattedDistance.length === 2) {
          formattedDistance = "0" + formattedDistance;
        }
        elDistance.innerHTML = formattedDistance;

        // Calcul et affichage du pourcentage de mouvement
        let movingDistance = Math.floor(
          (distanceSinceWatching / MAX_MOVEMENT) * 100
        );
        movingDistance = "" + Math.min(100, movingDistance);
        if (movingDistance.length === 1) {
          movingDistance = "0" + movingDistance;
        }
        elMovement.innerHTML = `${movingDistance}%`;

        // Dessiner un cercle autour du visage détecté
        ctx.beginPath();
        ctx.arc(det[1], det[0], det[2] / 2, 0, 2 * Math.PI, false);
        ctx.stroke();
      }
    }

    // Mise à jour du chronomètre
    updateTimer(MAX_TIME - (Date.now() - mycamvas.startTime) / 1000);

    // Vérifier si le temps imparti est écoulé
    if ((Date.now() - mycamvas.startTime) / 1000 > MAX_TIME) {
      timeOut(); // Fonction appelée lorsque le temps est écoulé
    }
  };
  /*
    (4) Initialisation de la gestion de la caméra (voir https://github.com/cbrandolino/camvas)
  */
  mycamvas = new camvas(ctx, processfn, () => {
    playing = true;
    updateWatching();
  });
  /*
      (5) Tout semble bien fonctionner
    */
  initialized = true;
}

// Gestionnaire d'événement pour le bouton de démarrage
elStart.addEventListener("click", () => {
  init();

  // Modifier les classes CSS pour changer l'état visuel du jeu
  elContainer.classList.add("is-playing");
  elHowTo.classList.remove("is-visible");
});
/**
 * Gère la logique lorsque le joueur atteint la fin du jeu.
 * Arrête les animations, joue le son de victoire, et affiche l'écran de victoire.
 */
function reachedEnd() {
  watchingTween.kill(); // Arrête l'animation de surveillance
  sigh.currentTime = 0;
  sigh.play(); // Joue le son de soulagement
  audioDoll.pause(); // Met en pause le son de la poupée
  mycamvas.stop(); // Arrête la caméra
  playing = false; // Met à jour l'état de jeu à "non en cours"
  elWin.classList.add("is-visible"); // Affiche l'écran de victoire
  elContainer.classList.remove("is-playing"); // Retire la classe indiquant que le jeu est en cours
}

/**
 * Gère la logique lorsque le temps imparti est écoulé.
 * Arrête les animations, joue le son de défaite, et affiche l'écran de défaite.
 */
function timeOut() {
  watchingTween.kill(); // Arrête l'animation de surveillance
  audioDoll.pause(); // Met en pause le son de la poupée
  shotGun.currentTime = 0;
  shotGun.play(); // Joue le son de coup de feu
  mycamvas.stop(); // Arrête la caméra
  playing = false; // Met à jour l'état de jeu à "non en cours"
  elDead.classList.add("is-visible"); // Affiche l'écran de défaite
  elContainer.classList.remove("is-playing"); // Retire la classe indiquant que le jeu est en cours
}

/**
 * Gère la logique lorsque le joueur est éliminé.
 * Arrête les animations, joue le son de défaite, et affiche l'écran de défaite.
 */
function dead() {
  watchingTween.kill(); // Arrête l'animation de surveillance
  audioDoll.pause(); // Met en pause le son de la poupée
  shotGun.currentTime = 0;
  shotGun.play(); // Joue le son de coup de feu
  mycamvas.stop(); // Arrête la caméra
  playing = false; // Met à jour l'état de jeu à "non en cours"
  elDead.classList.add("is-visible"); // Affiche l'écran de défaite
  elContainer.classList.remove("is-playing"); // Retire la classe indiquant que le jeu est en cours
}
let watchingTween = null;
/**
 * Met à jour l'état de surveillance de la poupée dans le jeu.
 * Alterne entre l'état où la poupée regarde et celui où elle ne regarde pas,
 * et ajuste les effets visuels et sonores en conséquence.
 */
function updateWatching() {
  // Quitter la fonction si le jeu n'est pas en cours
  if (!playing) return;

  // Inverser l'état de surveillance de la poupée
  isWatching = !isWatching;

  // Calculer une durée aléatoire pour l'état de surveillance
  let duration = Math.random() * 3.5 + 2.5;
  // Si la poupée regarde, choisir une durée plus courte
  if (isWatching) {
    duration = Math.random() * 2 + 2;
  }

  // Si la poupée ne regarde pas, jouer le son et ajuster sa vitesse de lecture
  if (!isWatching) {
    audioDoll.currentTime = 0;
    audioDoll.playbackRate = (audioDollDuration - 0.5) / duration;
    audioDoll.play();
  }

  // Animation de la rotation de la tête de la poupée
  gsap.to(head.rotation, {
    y: isWatching ? 0 : -Math.PI, // Rotation en fonction de l'état de surveillance
    duration: 0.4, // Durée de l'animation
  });

  // Planifier la prochaine mise à jour de surveillance
  watchingTween = gsap.to(
    {},
    {
      duration: duration,
      onComplete: updateWatching, // Rappel une fois la durée écoulée
    }
  );

  // Réinitialiser la distance parcourue depuis la dernière surveillance
  if (!isWatching) {
    distanceSinceWatching = 0;
  }
}

/**
 * Met à jour l'affichage du timer sur l'interface utilisateur.
 * Affiche le temps restant sous la forme mm:ss.
 *
 * @param {number} timeLeft - Le temps restant en secondes.
 */
function updateTimer(timeLeft) {
  // Convertir le temps restant en minutes et secondes
  let min = "" + Math.floor(timeLeft / 60);
  // Ajouter un zéro devant si les minutes sont à un chiffre
  if (min.length === 1) {
    min = "0" + min;
  }

  // Convertir le reste en secondes
  let sec = "" + Math.floor(timeLeft % 60);
  // Ajouter un zéro devant si les secondes sont à un chiffre
  if (sec.length === 1) {
    sec = "0" + sec;
  }

  // Si le temps est écoulé, afficher 00:00
  if (timeLeft < 0) {
    min = "00";
    sec = "00";
  }

  // Mettre à jour le contenu HTML de l'élément du timer avec le temps formaté
  elTime.innerHTML = `${min}:${sec}`;
}

/**
 * Configuration et initialisation de la scène 3D avec Three.js.
 * Crée une scène, une caméra, des lumières, et charge des objets 3D.
 */

// Création de la scène 3D
const scene = new THREE.Scene();

// Détermination de la largeur et de la hauteur de la scène en fonction de la fenêtre
let sceneWidth = 0;
if (window.innerWidth / window.innerHeight > 1.9) {
  sceneWidth = window.innerWidth * 0.6;
} else {
  sceneWidth = window.innerWidth * 0.95;
}
let sceneHeight = sceneWidth / 2;

// Création de la caméra avec une perspective spécifique
const camera = new THREE.PerspectiveCamera(
  75,
  sceneWidth / sceneHeight,
  0.1,
  1000
);

// Configuration du rendu avec WebGL
const renderer = new THREE.WebGLRenderer({
  alpha: true, // Permet la transparence du fond
  antialias: true, // Lissage des bords
});
renderer.setSize(sceneWidth, sceneHeight);
elGame.appendChild(renderer.domElement); // Ajout du rendu dans l'élément du DOM

// Positionnement de la caméra dans la scène
camera.position.y = 2.8;
camera.position.z = 11;
// camera.lookAt(new THREE.Vector3(0, -2, 0));

// Création et ajout de différentes lumières à la scène
const light = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(light);
const light2 = new THREE.AmbientLight(0x404040, 1.2);
scene.add(light2);
const spotLight = new THREE.SpotLight(0xffffff);
spotLight.position.set(100, 1000, 100);
scene.add(spotLight);

// Création d'un groupe pour la tête (pour une animation éventuelle)
let head = new THREE.Group();
scene.add(head);

// Chargement d'un modèle 3D pour la poupée
const loader = new THREE.GLTFLoader();
loader.load(
  "https://assets.codepen.io/127738/Squid_game_doll.gltf",
  function (gltf) {
    // Fonction de rappel après le chargement réussi
    scene.add(gltf.scene);
    // Configuration spécifique à la poupée
    head.add(gltf.scene.children[0].children[0].children[0].children[1]);
    head.add(gltf.scene.children[0].children[0].children[0].children[1]);
    head.add(gltf.scene.children[0].children[0].children[0].children[2]);
    head.children[0].position.y = -8;
    head.children[1].position.y = -8;
    head.children[2].position.y = -8;
    head.children[0].position.z = 1;
    head.children[1].position.z = 1;
    head.children[2].position.z = 1;
    head.children[0].scale.setScalar(1);
    head.children[1].scale.setScalar(1);
    head.children[2].scale.setScalar(1);
    head.position.y = 8;
    head.position.z = -1;
    elStart.classList.add("is-ready"); // Indique que le rendu est prêt
  },
  function (xhr) {
    // Fonction de rappel pendant le chargement
    console.log((xhr.loaded / xhr.total) * 100 + "% chargé");
  },
  function (error) {
    // Fonction de rappel en cas d'erreur
    console.log("Une erreur est survenue", error);
  }
);

/**
 * Initialise et gère la boucle d'animation pour le rendu de la scène 3D.
 */
renderer.setAnimationLoop(renderWebGL);

/**
 * Fonction appelée à chaque image pour mettre à jour et rendre la scène 3D.
 */
function renderWebGL() {
  // Effectue le rendu de la scène avec la caméra configurée
  renderer.render(scene, camera);
}

/**
 * Gestionnaire d'événements pour ajuster la scène lors du redimensionnement de la fenêtre.
 */
function onWindowResize() {
  // Ajuster la largeur de la scène en fonction du rapport largeur/hauteur de la fenêtre
  if (window.innerWidth / window.innerHeight > 1.9) {
    sceneWidth = window.innerWidth * 0.6;
  } else {
    sceneWidth = window.innerWidth * 0.95;
  }
  sceneHeight = sceneWidth / 2;

  // Mise à jour de l'aspect de la caméra et de la matrice de projection
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();

  // Mise à jour de la taille du rendu pour correspondre à la nouvelle taille de la fenêtre
  renderer.setSize(sceneWidth, sceneHeight);
}
// Ajout du gestionnaire d'événements pour réagir au redimensionnement de la fenêtre
window.addEventListener("resize", onWindowResize, false);
// Appel initial pour configurer la taille correcte dès le chargement
onWindowResize();

/**
 * Réinitialise et relance le jeu.
 * Remet à zéro les paramètres de jeu et redémarre la caméra.
 */
function replay() {
  // Réinitialisation de l'interface utilisateur pour l'état de jeu
  elContainer.classList.add("is-playing");
  elDead.classList.remove("is-visible");
  elWin.classList.remove("is-visible");

  // Réinitialisation des variables de jeu
  distance = 0;
  isWatching = true;
  distanceSinceWatching = 0;
  playing = true;

  // Mise à jour de l'état de surveillance et redémarrage de la caméra
  updateWatching();
  mycamvas.startTime = Date.now();
  mycamvas.play();
}

// Ajout de gestionnaires d'événements pour relancer le jeu lorsque les boutons replay sont cliqués
elReplay1.addEventListener("click", () => {
  replay();
});

elReplay2.addEventListener("click", () => {
  replay();
});
