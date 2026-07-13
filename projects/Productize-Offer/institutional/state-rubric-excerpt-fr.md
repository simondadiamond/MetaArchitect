# La grille de notation STATE : extrait de terrain

> Artefact institutionnel #1 pour la section « Ce que vous gardez » de /audit. Extrait public de `../audit/state-scoring-rubric.md`. Version prête pour le site : aucun tiret cadratin (interdit par DESIGN.md), aucun prix interne, jeu d'ancrages incomplet à dessein. La grille complète est un livrable payant.

---

Chaque Audit IA de production note vos flux de travail avec cet instrument. Cet extrait est public parce qu'une grille de notation qu'on ne peut pas inspecter, c'est une impression avec un en-tête. La version complète (les cinq piliers ancrés sur quatre niveaux, avec les règles de preuve et le registre de calibration) fait partie des artefacts que vous gardez après un audit.

## Ce qui est noté

Des flux de travail, pas des entreprises. Un flux de travail : un chemin, d'un déclencheur à un effet réel, qui passe par au moins un appel LLM. Chaque flux noté reçoit cinq scores de pilier, de 0 à 3, établis sur des preuves : code, traces, schémas, et tests en direct avec vos ingénieurs. Jamais sur un questionnaire.

## L'échelle

| Niveau | Nom | Signification |
|---|---|---|
| 0 | Absent | La propriété n'existe pas. Le mode de défaillance qu'elle prévient est actif et invisible. |
| 1 | Improvisé | Des fragments existent, par accident ou par héroïsme individuel. Casse sous le stress, le roulement de personnel ou la charge. |
| 2 | Systématique | Existe par conception à travers le flux. Des lacunes nommées et bornées subsistent. |
| 3 | Vérifié | Existe par construction. Prouvé par des tests. Ne peut pas régresser en silence. |

Le saut qui compte commercialement, c'est 1 vers 2 : c'est là qu'un flux cesse de dépendre du seul ingénieur qui le porte dans sa tête. Le saut qui compte en incident, c'est 2 vers 3 : « on pensait avoir ça » vit exactement entre les deux.

## Les cinq tests en direct

La documentation dit ce qu'une équipe voulait faire. Les tests en direct disent ce qui est vrai. Un par pilier, exécuté pendant l'audit :

- **Structuré** : prenez une exécution qui a planté. À partir de l'état persisté seulement (pas de transcription, pas de fouille dans les logs), votre ingénieur peut-il nommer l'étape exacte où elle s'est arrêtée?
- **Traçable** : je choisis une exécution de la semaine dernière (pas vous). La trace complète : chaque appel LLM, chaque appel d'outil, entrées, sorties, version du modèle. En moins de dix minutes?
- **Auditable** : l'exercice des 30 minutes. Une vraie décision automatisée qui a touché une personne : quels renseignements personnels ont servi, quels étaient les principaux facteurs, quelle version du modèle et du prompt a tourné? La Loi 25 présume que vous pouvez répondre.
- **Tolérant** : le test de redémarrage. Tuez le flux en plein vol dans un environnement sûr et regardez ce qui se passe au redémarrage. Version papier : demandez séparément à deux ingénieurs ce qui arrive après un plantage à l'étape 6 sur 10. Des réponses divergentes, c'est un résultat.
- **Explicite** : la marche des frontières. Énumérez chaque point où une sortie du modèle devient une écriture ou une action. Pour chacun : quelle est la pire chose que le modèle pourrait produire ici, et qu'est-ce qui l'arrête? Pas d'énumération : échec.

Un test en direct échoué plafonne le pilier à 1, peu importe ce que dit le diagramme d'architecture.

## Ancrages en exemple : le pilier Tolérant

Ce à quoi ressemblent les quatre niveaux sur le terrain, pour un pilier sur cinq :

| Score | Sur le terrain |
|---|---|
| 0 | Toute défaillance en cours d'exécution force un redémarrage à zéro. Du travail est perdu, ou appliqué en double au réessai. « On relance et on efface les doublons à la main. » |
| 1 | Des réessais existent au niveau des appels, mais aucune reprise au niveau du flux. Décoincer les exécutions bloquées est un rituel hebdomadaire manuel. |
| 2 | Le flux reprend à l'étape échouée, par conception. Verrous posés et libérés. Mais le test de redémarrage n'a jamais été exécuté pour vrai. |
| 3 | Le test de redémarrage passe, est répété sur un calendrier, et un plantage à l'étape 6 reprend démontrablement à l'étape 6. |

## Trois des règles de notation

1. On note ce qui est observé, pas ce qui est planifié. Ce qui est sur la feuille de route compte comme absent.
2. Une preuve, ou ce n'est pas arrivé. Chaque score cite un pointeur : un fichier, un identifiant de trace, une requête, une citation corroborée. Croire sincèrement à une journalisation qu'on ne peut pas produire plafonne le pilier à 1.
3. Entre deux niveaux, prenez le plus bas. Les ancrages sont écrits pour qu'une vraie hésitation soit rare.

## Le score global

Cinq piliers, 0 à 15 par flux. 6 sur 15, c'est le premier score le plus courant que je vois chez des systèmes déclarés « prêts pour la production ». Les noms de bandes (Risque critique, Risque élevé, En développement, Prêt pour la production, Conforme STATE) font devant votre direction le travail honnête que « ça marche pas pire » ne fera jamais.

Envie de voir où vous atterririez avant que quiconque lise vos traces? L'auto-évaluation gratuite à simonparis.ca/score est la forme courte de cet instrument. Les scores auto-évalués sont habituellement optimistes de 2 à 4 points. Cet écart aussi est un constat.
