@AGENTS.md

Все правила проекта в AGENTS.md (его же читает Codex). Здесь только то, что касается Claude Code.

- Машина Windows. Твой Bash-инструмент работает в Git Bash: пиши пути через `/`, Python только `.venv/Scripts/python.exe`, ruff `.venv/Scripts/ruff.exe`, pytest `.venv/Scripts/pytest.exe`. Глобальный pip сломан, не трогай его. Команды в AGENTS.md записаны для PowerShell человека, переводи их.
- Перед правкой движка перечитай раздел «Как работает поиск» в AGENTS.md.
- После правки в `backend/app/` или словарях запускай `.venv/Scripts/python.exe backend/scripts/eval.py` и показывай итог.
- UI: скилл impeccable и раздел «Фронтенд» в AGENTS.md (токены и структура макета). Проверяй экраны через Playwright MCP (подключён в `.mcp.json`).
- `git push` только с разрешения человека. `--force` запрещён.
- Не знаешь, есть ли готовый скилл под задачу: скилл find-skills.
- Ветки, коммиты, стиль и имена строго по CONVENTIONS.md.  Никаких трейлеров Co-Authored-By и упоминаний ИИ в коммитах. Коммить только свою зону и только после её проверок.
- Принял важное решение: допиши строку в таблицу «Решения» в AGENTS.md.
