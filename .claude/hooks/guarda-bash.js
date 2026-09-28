// Trava mecânica: nega comandos destrutivos ou que escrevem no ERP, seja quem for que os peça.
let dados = "";
process.stdin.on("data", (c) => (dados += c));
process.stdin.on("end", () => {
  let cmd = "";
  try { cmd = JSON.parse(dados).tool_input?.command || ""; } catch (_) {}
  const regras = [
    [/docker\s+(stack|service)\s+rm/i, "remove stack ou serviço na VPS"],
    [/docker\s+volume\s+(rm|prune)/i, "apaga volume do Docker"],
    [/docker\s+system\s+prune/i, "prune do Docker"],
    [/(drop|truncate)\s+(schema|database|table)?\s*("?erp"?\.|"?erp"?\b|prumo)/i, "apaga a cópia final da Link (esquema erp)"],
    [/git\s+push\b.*(--force|\s-f\b)/i, "force push"],
    [/git\s+reset\s+--hard/i, "descarta trabalho commitado"],
    [/rm\s+-rf\s+("?\/|~|\.\.|\$HOME|[A-Z]:)/i, "rm -rf fora do projeto"],
    [/meuerponline[\s\S]*-X\s*['"]?(POST|PUT|PATCH|DELETE)|-X\s*['"]?(POST|PUT|PATCH|DELETE)[\s\S]*meuerponline/i, "escrita no ERP (o Kaizen só lê)"],
  ];
  for (const [re, motivo] of regras) {
    if (re.test(cmd)) {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason:
            "Bloqueado por docs/AUTONOMIA.md (" + motivo + "). " +
            "Isso não se faz em modo autônomo. Encontre outro caminho ou registre em docs/DECISOES.md como pendência para o dono e siga com o resto."
        }
      }));
      return;
    }
  }
  process.exit(0);
});
