"""API Flask de Arbolito Adivino."""
from __future__ import annotations

from pathlib import Path

from flask import Flask, jsonify, render_template, request

from .tree import DecisionTree

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "tree.json"


def create_app(data_file: Path = DATA_FILE) -> Flask:
    app = Flask(__name__)
    tree = DecisionTree.load(data_file) if data_file.exists() else DecisionTree.default()

    def snapshot() -> dict:
        return {
            "tree": tree.to_dict(),
            "stats": tree.stats(),
            "traversals": {
                "preorden": list(tree.preorder()),
                "inorden": list(tree.inorder()),
                "postorden": list(tree.postorder()),
                "niveles": list(tree.levelorder()),
            },
        }

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/tree")
    def get_tree():
        return jsonify(snapshot())

    @app.get("/api/node")
    def get_node():
        path = request.args.get("path", "")
        try:
            node = tree.walk(path)
        except ValueError as exc:
            return jsonify(error=str(exc)), 400
        return jsonify(text=node.text, leaf=node.is_leaf, path=path)

    @app.post("/api/learn")
    def learn():
        body = request.get_json(silent=True) or {}
        try:
            tree.learn(
                str(body.get("path", "")),
                str(body.get("animal", "")),
                str(body.get("question", "")),
                bool(body.get("answer_for_new", True)),
            )
        except ValueError as exc:
            return jsonify(error=str(exc)), 400
        tree.save(data_file)
        return jsonify(snapshot()), 201

    @app.post("/api/reset")
    def reset():
        nonlocal tree
        tree = DecisionTree.default()
        if data_file.exists():
            data_file.unlink()
        return jsonify(snapshot())

    return app
