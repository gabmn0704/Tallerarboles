import threading
import webbrowser

from app.server import create_app

URL = "http://127.0.0.1:5000"

if __name__ == "__main__":
    threading.Timer(1.0, lambda: webbrowser.open(URL)).start()
    create_app().run(host="127.0.0.1", port=5000)
