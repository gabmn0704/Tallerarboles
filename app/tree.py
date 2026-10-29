"""Árbol de decisión binario para el juego «Arbolito Adivino».

Cada nodo interno es una pregunta de sí/no: el hijo ``yes`` se sigue cuando la
respuesta es «sí» y el hijo ``no`` cuando es «no». Cada hoja guarda una
respuesta (un animal). Cuando el juego falla, la hoja se reemplaza por un nodo
pregunta nuevo con dos hojas: así el árbol aprende.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Optional


@dataclass
class Node:
    text: str
    yes: Optional["Node"] = None
    no: Optional["Node"] = None

    @property
    def is_leaf(self) -> bool:
        return self.yes is None and self.no is None

    def to_dict(self) -> dict:
        data = {"text": self.text, "leaf": self.is_leaf}
        if not self.is_leaf:
            data["yes"] = self.yes.to_dict()
            data["no"] = self.no.to_dict()
        return data

    @classmethod
    def from_dict(cls, data: dict) -> "Node":
        if data.get("leaf", "yes" not in data):
            return cls(data["text"])
        return cls(data["text"], cls.from_dict(data["yes"]), cls.from_dict(data["no"]))


class DecisionTree:
    def __init__(self, root: Node):
        self.root = root

    # --- navegación -----------------------------------------------------
    def walk(self, path: str) -> Node:
        """Recorre el árbol siguiendo un camino de 'y'/'n'. Lanza ValueError si no existe."""
        node = self.root
        for step in path:
            if step not in "yn":
                raise ValueError(f"paso inválido: {step!r}")
            if node.is_leaf:
                raise ValueError("el camino atraviesa una hoja")
            node = node.yes if step == "y" else node.no
        return node

    # --- aprendizaje ----------------------------------------------------
    def learn(self, path: str, animal: str, question: str, answer_for_new: bool) -> None:
        """Reemplaza la hoja en ``path`` por una pregunta que separa el animal viejo del nuevo."""
        leaf = self.walk(path)
        if not leaf.is_leaf:
            raise ValueError("solo se puede aprender sobre una hoja")
        animal, question = animal.strip(), question.strip()
        if not animal or not question:
            raise ValueError("animal y pregunta son obligatorios")
        if animal.lower() == leaf.text.lower():
            raise ValueError("el animal nuevo es igual al adivinado")
        new_leaf = Node(animal)
        old_leaf = Node(leaf.text)
        leaf.text = question
        leaf.yes, leaf.no = (new_leaf, old_leaf) if answer_for_new else (old_leaf, new_leaf)

    # --- recorridos -----------------------------------------------------
    def preorder(self, node: Optional[Node] = None) -> Iterator[str]:
        node = node or self.root
        yield node.text
        if not node.is_leaf:
            yield from self.preorder(node.yes)
            yield from self.preorder(node.no)

    def inorder(self, node: Optional[Node] = None) -> Iterator[str]:
        node = node or self.root
        if node.is_leaf:
            yield node.text
            return
        yield from self.inorder(node.yes)
        yield node.text
        yield from self.inorder(node.no)

    def postorder(self, node: Optional[Node] = None) -> Iterator[str]:
        node = node or self.root
        if not node.is_leaf:
            yield from self.postorder(node.yes)
            yield from self.postorder(node.no)
        yield node.text

    def levelorder(self) -> Iterator[str]:
        queue = [self.root]
        while queue:
            node = queue.pop(0)
            yield node.text
            if not node.is_leaf:
                queue += [node.yes, node.no]

    # --- métricas -------------------------------------------------------
    def leaves(self) -> list[str]:
        return [n for n in self._leaves(self.root)]

    def _leaves(self, node: Node) -> Iterator[str]:
        if node.is_leaf:
            yield node.text
        else:
            yield from self._leaves(node.yes)
            yield from self._leaves(node.no)

    def height(self, node: Optional[Node] = None) -> int:
        node = node or self.root
        if node.is_leaf:
            return 1
        return 1 + max(self.height(node.yes), self.height(node.no))

    def size(self) -> int:
        return sum(1 for _ in self.preorder())

    def stats(self) -> dict:
        leaves = self.leaves()
        return {
            "animals": len(leaves),
            "questions": self.size() - len(leaves),
            "height": self.height(),
        }

    # --- persistencia ---------------------------------------------------
    def to_dict(self) -> dict:
        return self.root.to_dict()

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(self.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")

    @classmethod
    def load(cls, path: Path) -> "DecisionTree":
        return cls(Node.from_dict(json.loads(path.read_text(encoding="utf-8"))))

    @classmethod
    def default(cls) -> "DecisionTree":
        return cls(
            Node(
                "¿Vive en el agua?",
                yes=Node("¿Es un mamífero?", yes=Node("Delfín"), no=Node("Pez payaso")),
                no=Node(
                    "¿Tiene cuatro patas?",
                    yes=Node("¿Maúlla?", yes=Node("Gato"), no=Node("Perro")),
                    no=Node("¿Puede volar?", yes=Node("Águila"), no=Node("Serpiente")),
                ),
            )
        )
