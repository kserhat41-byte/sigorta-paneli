@echo off
cd /d C:\sigorta_panel_offline_indexeddb
echo Yerel sunucu başlatılıyor...
python -m http.server 8000 >nul 2>&1
