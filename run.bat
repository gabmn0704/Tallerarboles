@echo off
cd /d "%~dp0"
if not exist .venv (
  echo Creando entorno virtual...
  python -m venv .venv || py -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
python run.py
pause
