// Bloqueia a ferramenta AskUserQuestion. Em modo autônomo quem decide é o orquestrador.
// O motivo abaixo volta para o agente como resposta da ferramenta.
const saida = {
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason:
      "Modo autônomo (docs/AUTONOMIA.md): o dono não responde perguntas durante a fase. " +
      "Decida você mesmo pela opção mais simples que atende OBJETIVO.md e a spec da fase, " +
      "registre em docs/DECISOES.md (o quê, por quê, o que muda se estiver errado) e siga."
  }
};
process.stdout.write(JSON.stringify(saida));
