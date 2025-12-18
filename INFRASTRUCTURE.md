# Recomendação de Infraestrutura - CDNProxy v2

Este documento descreve as recomendações de hardware e hospedagem para a separação do ambiente em **Frontend (Nuxt.js)** e **Backend (Go)**.

---

## 🏗️ 1. Servidor Frontend (Nuxt.js SPA)
O Frontend atua como uma **SPA (Single Page Application)**. Ele não requer processamento de servidor (Node.js) em tempo de execução, pois gera apenas arquivos estáticos (HTML/CSS/JS) consumidos pelo navegador do cliente.

### Requisitos
*   **CPU**: Baixa demanda (Apenas serve arquivos estáticos).
*   **RAM**: ~512MB (Suficiente para Nginx/Apache + SO).
*   **Armazenamento**: ~10GB (O build é leve, espaço apenas para Logs do Nginx).

### Recomendações de Hospedagem

| Provedor | Plano Recomendado | Preço Est. | Vantagem |
| :--- | :--- | :--- | :--- |
| **Vercel / Netlify** | **Gratuito / Pro** | **$0 - $20/mês** | **Recomendado**. CDN Global, Deploy automático via Git, HTTPS grátis. Zero manutenção de servidor. |
| **Cloudflare Pages** | **Gratuito** | **$0** | Performance excelente, custo zero e proteção DDoS nativa. |
| **VPS (DigitalOcean)** | Droplet Basic | $4/mês | Caso precise de controle total ou IP fixo exclusivo para o front. |

---

## 🚀 2. Servidor Backend (Go)
O Backend é crítico pois atua como **Proxy de Streaming** e API. A performance dele impacta diretamente a velocidade dos vídeos para o usuário final.

### Fatores de Escala
*   **CPU**: Go usa concorrência (Goroutines). Mais núcleos = Mais requisições simultâneas.
*   **Rede (Banda)**: Fator mais crítico. O servidor precisa de link de 1Gbps ou mais para não gargalar o vídeo.
*   **RAM**: Usada para buffers de I/O. 2GB é o mínimo seguro.

### Recomendações por Cenário

#### A. Início / Tráfego Moderado (Até ~5k usuários simultâneos)
Ideal para iniciar a operação com custo controlado.

*   **vCPU**: 2 vCPUs (Compartilhadas ou Dedicadas Basic)
*   **RAM**: 2GB - 4GB RAM
*   **Armazenamento**: 40GB SSD NVMe (Logs e Sistema)
*   **Exemplos**:
    *   **Hetzner**: CPX21 (3 vCPU, 4GB RAM) - ~€8/mês 🌟 *(Melhor Custo-Benefício)*
    *   **DigitalOcean**: Droplet (2 vCPU, 2GB RAM) - ~$18/mês
    *   **Vultr**: Cloud Compute (2 vCPU, 4GB RAM) - ~$20/mês

#### B. Alta Performance / Escala (10k+ usuários simultâneos)
Para operações maduras que não podem oscilar.

*   **vCPU**: 4 vCPUs **Dedicadas** (Evita "roubo" de CPU por vizinhos de VPS)
*   **RAM**: 8GB - 16GB RAM
*   **Rede**: Link Dedicado 1Gbps ou 10Gbps
*   **Exemplos**:
    *   **Hetzner**: CCX33 (4 vCPU Dedicado, 16GB RAM) - ~€30/mês
    *   **AWS**: c6g.xlarge (4 vCPU Graviton2, 8GB RAM) - Custo variável (Alto)
    *   **DigitalOcean**: CPU-Optimized (4 vCPU, 8GB RAM) - ~$84/mês

---

## 🗄️ 3. Banco de Dados
Recomenda-se **NÃO** hospedar o banco de dados no mesmo servidor do Backend para evitar que picos de tráfego derrubem a conexão com o banco.

*   **Recomendação**: Manter no **Supabase** (Gerenciado).
*   **Plano**: Free (Início) -> Pro ($25/mês) conforme a base de usuários cresce.

---

## 📝 Resumo da Arquitetura Ideal

1.  **Frontend**: Hospedado na **Vercel** (Conectado ao GitHub).
2.  **Backend**: Um servidor na **Hetzner (CPX Series)** rodando Docker.
3.  **Banco**: **Supabase**.
4.  **Segurança**: Colocar o **Cloudflare** na frente de tudo (Frontend e Backend) para Proxy Reverso e SSL.
