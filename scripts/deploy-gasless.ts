import { createPublicClient, http, parseEther } from "viem";
import { createSmartAccountClient } from "@zerodev/sdk";
import { sepolia } from "viem/chains";

declare const process: {
  env: {
    ZERODEV_PROJECT_ID?: string;
    PRIVATE_KEY?: string;
  };
};

async function main() {
  const projectId = process.env.ZERODEV_PROJECT_ID;
  if (!projectId) {
    throw new Error("Defina ZERODEV_PROJECT_ID no ambiente");
  }

  const ownerPrivateKey = process.env.PRIVATE_KEY;
  if (!ownerPrivateKey) {
    throw new Error("Defina PRIVATE_KEY no ambiente");
  }

  const client = await createSmartAccountClient({
    projectId,
    chain: sepolia,
    owner: ownerPrivateKey,
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  console.log("Smart Account address:", client.account.address);

  const artifact = require("../artifacts/contracts/MockToken.sol/MockToken.json");
  const bytecode = artifact.bytecode;
  const abi = artifact.abi;

  if (!bytecode || bytecode === "0x") {
    throw new Error("Bytecode do MockToken não encontrado. Rode `npx hardhat compile` primeiro.");
  }

  const txHash = await client.deployContract({
    abi,
    bytecode,
    args: [parseEther("1000000")],
  });

  console.log("Gasless deploy txHash:", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (!receipt.contractAddress) {
    throw new Error("Endereço do contrato não encontrado na transação de deploy");
  }

  console.log("MockToken implantado em:", receipt.contractAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
