# Conectar MetaMask usando JavaScript + Wagmi

Este guia mostra como iniciar rapidamente um dapp React/Next.js que usa o MetaMask SDK e Wagmi para conectar carteiras MetaMask. Ele cobre tanto o uso do modelo oficial quanto a integração manual em um projeto existente.

## Pré-requisitos

- Node.js v19 ou superior instalado.
- Um gerenciador de pacotes (npm, Yarn, pnpm ou Bun).
- MetaMask instalado no navegador (desktop) ou aplicativo móvel.
- Opcional: conta Infura para obter `INFURA_API_KEY` usado pelos conectores.

## Opção 1 — Quickstart oficial

1. Baixe o template inicial rápido fornecido pela MetaMask:
   ```bash
   npx degit MetaMask/metamask-sdk-examples/quickstarts/wagmi metamask-wagmi
   ```
2. Entre no diretório do projeto gerado:
   ```bash
   cd metamask-wagmi
   ```
3. Instale as dependências (exemplo com pnpm):
   ```bash
   pnpm install
   ```
4. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

A aplicação expõe botões para conectar/desconectar a carteira usando o MetaMask SDK já configurado.

## Opção 2 — Configuração manual em um projeto existente

### 1. Instale as dependências

Use seu gerenciador preferido (exemplo com npm):
```bash
npm install @metamask/sdk wagmi viem@2.x @tanstack/react-query
```

### 2. Configure o Wagmi e o MetaMask SDK

Crie ou atualize o arquivo principal da aplicação (por exemplo `src/App.tsx` em projetos Vite ou `pages/_app.tsx` em Next.js):

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet, linea, lineaSepolia } from "wagmi/chains";
import { metaMask } from "wagmi/connectors";

const config = createConfig({
  ssr: true,
  chains: [mainnet, linea, lineaSepolia],
  connectors: [
    metaMask({
      infuraAPIKey: process.env.NEXT_PUBLIC_INFURA_API_KEY!,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [linea.id]: http(),
    [lineaSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

Em aplicações Next.js, envolva o componente principal dentro de `AppProviders`:

```tsx
// pages/_app.tsx
import type { AppProps } from "next/app";
import { AppProviders } from "../components/AppProviders";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProviders>
      <Component {...pageProps} />
    </AppProviders>
  );
}
```

Garanta que a variável `NEXT_PUBLIC_INFURA_API_KEY` esteja definida (por exemplo, em `.env.local`).

### 3. Crie os botões de conexão/desconexão

Adicione um componente simples para gerenciar o estado da carteira:

```tsx
import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { address } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (address) {
    return (
      <div>
        <p>Conectado como {address}</p>
        <button onClick={() => disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div>
      {connectors.map((connector) => (
        <button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={!connector.ready || isPending}
        >
          {connector.name}
        </button>
      ))}
    </div>
  );
}
```

Inclua o `ConnectButton` em qualquer página/componente do seu dapp:

```tsx
import { ConnectButton } from "../components/ConnectButton";

export default function Home() {
  return (
    <main>
      <h1>SingulAI dapp</h1>
      <ConnectButton />
    </main>
  );
}
```

### 4. Executar o dapp

Inicie o servidor de desenvolvimento (exemplo com pnpm):
```bash
pnpm run dev
```
Abra o navegador na URL indicada (geralmente `http://localhost:5173` para Vite ou `http://localhost:3000` para Next.js) e use o botão para conectar a carteira MetaMask.

## Boas práticas adicionais

- Nunca exponha chaves privadas ou segredos em arquivos versionados; use variáveis de ambiente.
- Habilite HTTPS em produção para que o MetaMask funcione corretamente.
- Lide com estados de carregamento/erro no componente de conexão para melhor UX.
- Valide em qual rede a carteira está conectada e informe o usuário caso precise trocar.

Com essas etapas, seu dapp estará pronto para autenticar usuários com MetaMask usando o MetaMask SDK e a stack Wagmi + React Query.
