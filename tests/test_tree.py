import pytest

from app.tree import DecisionTree, Node


@pytest.fixture
def tree():
    return DecisionTree.default()


def test_walk_reaches_leaf(tree):
    assert tree.walk("yy").text == "Delfín"
    assert tree.walk("nyn").text == "Perro"


def test_walk_rejects_bad_paths(tree):
    with pytest.raises(ValueError):
        tree.walk("yyy")
    with pytest.raises(ValueError):
        tree.walk("x")


def test_learn_inserts_question(tree):
    tree.learn("nyn", "Lobo", "¿Aúlla?", True)
    node = tree.walk("ny")
    assert node.text == "¿Maúlla?"
    sub = tree.walk("nyn")
    assert sub.text == "¿Aúlla?"
    assert sub.yes.text == "Lobo" and sub.no.text == "Perro"
    assert tree.stats()["animals"] == 7


def test_learn_answer_no_puts_new_animal_on_no(tree):
    tree.learn("yy", "Ballena", "¿Es pequeño?", False)
    node = tree.walk("yy")
    assert node.yes.text == "Delfín" and node.no.text == "Ballena"


def test_learn_validation(tree):
    with pytest.raises(ValueError):
        tree.learn("y", "X", "¿?", True)  # no es hoja
    with pytest.raises(ValueError):
        tree.learn("yy", "delfín", "¿?", True)  # mismo animal
    with pytest.raises(ValueError):
        tree.learn("yy", " ", "¿?", True)


def test_traversals(tree):
    small = DecisionTree(Node("Q", Node("A"), Node("B")))
    assert list(small.preorder()) == ["Q", "A", "B"]
    assert list(small.inorder()) == ["A", "Q", "B"]
    assert list(small.postorder()) == ["A", "B", "Q"]
    assert list(small.levelorder()) == ["Q", "A", "B"]


def test_levelorder_default(tree):
    assert list(tree.levelorder())[0] == "¿Vive en el agua?"
    assert len(list(tree.levelorder())) == tree.size() == 11


def test_stats(tree):
    assert tree.stats() == {"animals": 6, "questions": 5, "height": 4}


def test_persistence_roundtrip(tree, tmp_path):
    tree.learn("nyn", "Lobo", "¿Aúlla?", True)
    f = tmp_path / "t.json"
    tree.save(f)
    assert DecisionTree.load(f).to_dict() == tree.to_dict()
