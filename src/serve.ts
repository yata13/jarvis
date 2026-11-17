import { networkInterfaces } from "node:os";
import { Memory } from "./memory/memory.js";
import { Routine } from "./routine/routine.js";
import { Agent } from "./agent/agent.js";
import { buildContext } from "./assistant.js";
import { loadOrCreateToken } from "./server/token.js";
import { createPhoneServer, PHONE_PORT } from "./server/phone-server.js";

/**
 * Starts JARVIS as a server, so your phone can chat with it.
 * Run this on the PC and leave it on. The phone connects over Tailscale.
 * Run with:  npm run serve
 */
function main(): void {
  const memory = new Memory();
  const routine = new Routine();
  const agent = new Agent(() => buildContext(memory, routine));
  const token = loadOrCreateToken();

  const server = createPhoneServer(memory, routine, agent, token);

  // 0.0.0.0 = listen on every network card, so Tailscale can reach it.
  // The token still keeps strangers out.
  server.listen(PHONE_PORT, "0.0.0.0", () => {
    console.log("JARVIS phone server is ON.\n");
    console.log("In the phone app, open Settings and enter:\n");
    for (const address of tailscaleAddresses()) {
      console.log(`  PC address:  ${address}:${PHONE_PORT}`);
    }
    console.log(`  Token:       ${token}\n`);
    console.log(
      "The PC address is your Tailscale IP (starts with 100.). If none is shown,\n" +
        "install Tailscale and sign in, then start this again.\n" +
        "Keep this window open. Press Ctrl+C to stop.\n",
    );
  });

  // A clear message if the port is already used (the server is already running).
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Port ${PHONE_PORT} is busy. Is JARVIS already running in another window?`);
    } else {
      console.error(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
}

/** Find this PC's Tailscale IP(s). They start with 100. and let the phone reach the PC. */
function tailscaleAddresses(): string[] {
  const found: string[] = [];
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && net.address.startsWith("100.")) found.push(net.address);
    }
  }
  // If Tailscale is not found, still show something so the user is not stuck.
  return found.length > 0 ? found : ["<your-PC-Tailscale-IP>"];
}

main();
