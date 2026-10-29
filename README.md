# Arbolito Adivino 🌳

**Taller de Árboles.** Juego de «piensa en un animal y yo lo adivino» construido sobre un
**árbol de decisión binario que aprende**. Backend en Python (Flask) y frontend en HTML, CSS y JavaScript.

## Caso de estudio

Es el mismo principio de los sistemas de «20 preguntas»: un árbol binario donde

- cada **nodo interno** es una pregunta de sí/no (el «sí» baja por el hijo izquierdo y el «no» por el derecho);
- cada **hoja** es una respuesta (un animal);
- cuando el árbol falla, **aprende**: la hoja se reemplaza por una pregunta nueva que separa
  el animal viejo del nuevo, y el árbol crece con dos hojas más.

## Qué incluye

- Juego guiado con atajos de teclado (`S` / `N`).
- Diagrama SVG del árbol que resalta el camino recorrido y anima los nodos nuevos.
- Recorridos: preorden, inorden, postorden y por niveles (BFS).
- Estadísticas: animales (hojas), preguntas (nodos internos) y altura.
- Persistencia en `data/tree.json` y botón para reiniciar el árbol.
- Tema claro y oscuro automático, responsive.

## Estructura

```
app/tree.py        # Node + DecisionTree: walk, learn, recorridos, stats, JSON
app/server.py      # API Flask (/api/tree, /api/node, /api/learn, /api/reset)
app/templates/     # index.html
app/static/        # style.css, app.js
tests/             # pytest: lógica del árbol y API
run.py             # arranque
```

## Ejecutar

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Abre http://127.0.0.1:5000

## Pruebas

```bash
pytest
```
