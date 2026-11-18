# DevOps Evaluation

Pour démarrer les trois services en Dev, copie `.env.example` vers `.env`
si tu n’as pas encore de fichier local, puis lance `docker compose up --build`.
Ouvre <http://localhost:3088>. Le lint et les tests API s’exécutent sur GitHub
Actions après un push sur `Dev`.

## Préparer Val et Prod

Sur le poste qui héberge Kubernetes, configure un runner Linux GitHub Actions
avec le label `kubernetes`, `kubectl`, `jq` et `curl`. Son compte doit pouvoir
lire et modifier les workloads et services, suivre les déploiements et ouvrir
un port-forward dans `devops-val` et `devops-prod`. Le cluster doit avoir une
StorageClass par défaut pour provisionner les volumes MySQL. Les images
publiées ciblent Linux amd64, comme le runner de construction.

Crée les namespaces et un secret MySQL différent dans chacun. Exécute ces
commandes une fois pour un cluster neuf. Pour une installation existante,
conserve les identifiants associés au volume MySQL et migre son schéma si besoin.

```bash
for ns in devops-val devops-prod; do
  kubectl create namespace "$ns" || break
  kubectl -n "$ns" create secret generic mysql-credentials \
    --from-literal=password="$(openssl rand -hex 32)" \
    --from-literal=root-password="$(openssl rand -hex 32)" || break
done
```

Vérifie les secrets GitHub Actions `DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN`.
Le compte doit pouvoir écrire dans les trois dépôts Docker Hub. Crée le dépôt
public `kaneki599/devops-db` s’il manque. Les deux autres dépôts utilisés
sont `kaneki599/devops-api` et
`kaneki599/devops_evaluation_ziyad_fares_antonin_younes`.

## Promouvoir une version

1. Intègre les changements dans `Dev` et vérifie les tests.
2. Fais passer le code dans `Val`. Le workflow **Validation** lance les
   tests, publie les trois images, les déploie sur `devops-val` et vérifie
   que le frontend accède à l’API et que la liste des tâches est lisible.
3. Après le succès de Val, fais passer le même contenu dans `Prod`.
   Le workflow **Déploiement production** doit aussi être présent sur la
   branche GitHub par défaut pour que le bouton **Run workflow** apparaisse.
   Lance-le depuis `Prod` et saisis le numéro de l’exécution Val réussie
   (le dernier nombre de son URL). Le workflow compare le contenu des
   deux versions et déploie les mêmes images par digest dans `devops-prod`.

Pour accéder aux deux frontends sur le poste Kubernetes, lance les commandes
dans deux terminaux distincts.

```bash
kubectl -n devops-val port-forward service/frontend 3089:80
kubectl -n devops-prod port-forward service/frontend 3090:80
```

MySQL exécute `database/init.sql` lors de la création du volume uniquement.
Toute modification du schéma doit faire l’objet d’une migration si un volume
contient déjà des données.
