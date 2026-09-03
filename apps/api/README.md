# Backend

## Debugging

Default enabled with script: dev:debug

WebStorm one-time setup

1. Run → Edit Configurations → + → Attach to Node.js/Chrome
2. Host: localhost, Port: 9229
3. Set a breakpoint in src/index.ts
4. docker compose up -d (starts the container with the inspector listening), then run the WebStorm debug config to
   attach
5. Hit http://localhost:3001/health — breakpoint should catch if placed inside that handler

