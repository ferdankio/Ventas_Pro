@echo off
echo === Subiendo Pro Ventas Magic a Railway ===

cd /d "%~dp0"

git init
git add .
git commit -m "version final completa"
git branch -M main
git remote remove origin 2>nul
git remote add origin https://github.com/ferdankio/Ventas_Pro.git
git push --force origin main

echo.
echo === Listo! Railway desplegara en 2 minutos ===
pause
