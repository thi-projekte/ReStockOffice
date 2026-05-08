
## Zugriff auf alle Artikel als JSON

Um eine JSON mit allen Artikeln der DB zu bekommen, verwende Folgendes:

```shell script
[url]/articles
```
Bsp.: 
```shell script
localhost:8080/articles
```

## Zugriff auf einen Artikel nach Artikelnummer als JSON

Um eine JSON mit einem Artikel per Artikelnummer der DB zu bekommen, verwende Folgendes:

```shell script
[url]/article?productId=[productId]
```
Bsp.:
```shell script
localhost:8080/article?productId=10001
```

## Zugriff auf mehrere Artikel nach Kategorie als JSON

Um eine JSON mit mehreren Artikel per Kategorie der DB zu bekommen, verwende Folgendes:

```shell script
[url]/articleByCategory?article-type=[article-type]
```
Bsp.:
```shell script
localhost:8080/articleByCategory?article-type=Schreibwaren
```