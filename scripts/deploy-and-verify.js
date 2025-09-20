require("dotenv").config();
const hre = require("hardhat");

function requireEnv(variableName) {
  const value = process.env[variableName];
  if (!value || value.trim() === "") {
    throw new Error(`Defina ${variableName} antes de executar este script.`);
  }
  return value.trim();
}

["PRIVATE_KEY", "ETHERSCAN_API_KEY", "SEPOLIA_RPC_URL", "MUMBAI_RPC_URL"].forEach(requireEnv);

const INITIAL_SUPPLY = hre.ethers.utils.parseEther("1000000");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Iniciando deploy do MockToken...");
  console.log(`Conta utilizada: ${deployer.address}`);

  const Token = await hre.ethers.getContractFactory("MockToken");
  const token = await Token.deploy(INITIAL_SUPPLY);
  await token.deployed();

  console.log(`MockToken implantado em: ${token.address}`);
  console.log("Iniciando verificação no explorador correspondente...");

  try {
    await hre.run("verify:verify", {
      address: token.address,
      constructorArguments: [INITIAL_SUPPLY]
    });
    console.log("Contrato verificado com sucesso.");
  } catch (error) {
    const message = error && error.message ? error.message : String(error);
    if (message.includes("Already Verified")) {
      console.log("Contrato já verificado anteriormente.");
    } else {
      console.error("Falha ao verificar o contrato. Detalhes:", message);
      throw error;
    }
  }

  console.log("Atualize suas variáveis de ambiente com o endereço do contrato conforme necessário.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    if (error && error.message) {
      console.error("Execução encerrada com erro:", error.message);
    } else {
      console.error("Execução encerrada com erro inesperado.");
    }
    process.exit(1);
  });
