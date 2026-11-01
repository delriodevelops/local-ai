# Local MCP servers in MeshMind

MeshMind is a web page, so it can only talk to MCP servers over HTTP. Most local servers (filesystem, git, databases, anything you start with `npx …` or `uvx …`) speak **stdio** instead: they expect a program to start them and talk through standard input and output, and a browser can't start programs.

A **bridge** fixes that: it starts the stdio server on your computer and exposes it as a Streamable HTTP endpoint that MeshMind can reach.

```
MeshMind (browser) ──HTTP──▶ bridge on 127.0.0.1 ──stdio──▶ the MCP server
```

## With supergateway

[supergateway](https://github.com/supercorp-ai/supergateway) needs only Node.js. This shares one folder through the official filesystem server:

```bash
npx -y supergateway \
  --stdio "npx -y @modelcontextprotocol/server-filesystem /path/to/folder" \
  --outputTransport streamableHttp \
  --host 127.0.0.1 --port 8000 \
  --cors "https://delriodevelops.github.io"
```

Then in MeshMind open **Settings → MCP servers** and add `http://127.0.0.1:8000/mcp`.

- `--host 127.0.0.1` keeps the bridge on your computer only. Without it, other devices on your network could reach it.
- `--cors` lets only MeshMind's site call the bridge. If you run MeshMind locally (`npm run dev`), use `http://localhost:5173` instead.
- Swap the `--stdio` command for any other server: `uvx mcp-server-git --repository /path/to/repo`, `npx -y @modelcontextprotocol/server-memory`, and so on.

## With mcp-proxy (Python)

[mcp-proxy](https://github.com/sparfenyuk/mcp-proxy) does the same from Python:

```bash
uvx mcp-proxy --port 8000 --allow-origin "https://delriodevelops.github.io" -- npx -y @modelcontextprotocol/server-filesystem /path/to/folder
```

It listens on 127.0.0.1 by default. Check `uvx mcp-proxy --help` for the endpoint path of your version (`/mcp` for Streamable HTTP, `/sse` for the older SSE transport); MeshMind speaks both.

Avoid bridges that allow every origin (`*`): any website you visit could then call the tools on your computer.

## Browser permissions

A public website calling `127.0.0.1` counts as reaching into your local network, and browsers are starting to ask first.

| Browser | What to do |
|---|---|
| Chrome, Edge | Allow the local network prompt the first time MeshMind connects. If you dismissed it, re-enable it in the site settings (padlock → Site settings). |
| Firefox | Recent versions may ask the same way; allow it for MeshMind. |
| Brave | Allow "Localhost access" for MeshMind in the site settings. |
| Safari | `http://localhost` is not always treated as secure. If it fails, serve the bridge over https (for example with [mkcert](https://github.com/FiloSottile/mkcert)) or use Chrome. |

## When it doesn't connect

- **"Could not reach the local server"**: the bridge isn't running, the port is different, the browser blocked the local network request (see above), or the bridge's CORS setting doesn't include MeshMind's address exactly (scheme, host and port must match). The browser reports all of these the same way, so check them in that order.
- **"There is no MCP endpoint at this address"**: the path is wrong; try `/mcp` or `/sse`.
- **"This server does not accept connections from websites"**: shown for a bridge reached through a non-local address (another computer, a tunnel); the causes are the same as above.

## Online servers without CORS

Some online MCP servers don't send CORS headers, so no website can call them directly. A bridge can relay them too: point it at the remote server instead of a local command (supergateway takes `--streamableHttp <url>` in place of `--stdio`; check its README for your version) and keep the same `--cors` setting.
