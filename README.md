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

- Juego guiado con atajos de teclado (`S` / `N`) y un **búho mascota** que reacciona (piensa, celebra, se entristece).
- Animaciones: texto que aparece palabra a palabra, indicador «pensando», confeti al ganar o aprender, hojas cayendo de fondo.
- Sonidos opcionales (botón de la bocina) y tema claro/oscuro manual.
- Diagrama SVG del árbol que resalta el camino recorrido, dibuja las ramas y anima los nodos nuevos.
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

## Ejecutar (Visual Studio Code)

Requisito: Python 3.10 o superior.

1. Abre la carpeta del proyecto en VS Code (`Archivo > Abrir carpeta`).
2. Ejecuta con un clic:
   - **Windows:** doble clic en `run.bat`
   - **Mac / Linux:** `./run.sh`
3. Se crea el entorno virtual, se instala Flask y se abre el navegador en http://127.0.0.1:5000

Manual, desde la terminal de VS Code:

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows  (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
python run.py
```

También puedes pulsar **F5** en VS Code (configuración «Arbolito Adivino»).

## Pruebas

```bash
pytest
```
