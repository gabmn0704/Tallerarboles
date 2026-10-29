import pytest

from app.server import create_app


@pytest.fixture
def client(tmp_path):
    return create_app(tmp_path / "tree.json").test_client()


def test_tree_endpoint(client):
    data = client.get("/api/tree").get_json()
    assert data["stats"]["animals"] == 6
    assert data["traversals"]["niveles"][0] == "¿Vive en el agua?"


def test_node_endpoint(client):
    assert client.get("/api/node?path=").get_json()["leaf"] is False
    assert client.get("/api/node?path=yy").get_json()["text"] == "Delfín"
    assert client.get("/api/node?path=yyy").status_code == 400


def test_learn_and_persist(client, tmp_path):
    r = client.post("/api/learn", json={"path": "nyn", "animal": "Lobo", "question": "¿Aúlla?", "answer_for_new": True})
    assert r.status_code == 201 and r.get_json()["stats"]["animals"] == 7
    again = create_app(tmp_path / "tree.json").test_client()
    assert again.get("/api/tree").get_json()["stats"]["animals"] == 7


def test_learn_invalid(client):
    r = client.post("/api/learn", json={"path": "y", "animal": "X", "question": "¿?"})
    assert r.status_code == 400


def test_reset(client):
    client.post("/api/learn", json={"path": "yy", "animal": "Ballena", "question": "¿Es enorme?", "answer_for_new": True})
    assert client.post("/api/reset").get_json()["stats"]["animals"] == 6
