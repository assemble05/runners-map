# Regras de ramificação (declaração do dono, 07/11/2026)

Texto do João, mantido como foi escrito. É a fonte das regras de ramificação; a leitura que o validador faz
está na ADR 0005 e os códigos em `docs/rules.md`.

---

REGRA CRÍTICA: RAMIFICAÇÕES INTERNAS DOS NÍVEIS

O cenário deve possuir ramificações de caminhos dentro de cada nível, criando diferentes possibilidades de movimentação.

É EXTREMAMENTE IMPORTANTE que cada ramificação permaneça exclusivamente dentro do nível em que foi criada.

1. Permanência no próprio nível

- Uma ramificação criada no Nível 1 deve permanecer inteiramente no Nível 1.
- Uma ramificação criada no Nível 2 deve permanecer inteiramente no Nível 2.
- Uma ramificação nunca pode atravessar para o outro nível.
- Uma ramificação nunca pode utilizar as paredes escaláveis como parte de seu percurso interno.
- A única maneira de mudar de nível continua sendo pelas duas paredes escaláveis nas extremidades do cenário.

2. Comprimento das ramificações

Cada ramificação deve respeitar obrigatoriamente os seguintes limites:

- Comprimento mínimo: 5% do comprimento horizontal total do nível.
- Comprimento máximo: 40% do comprimento horizontal total do nível.

Nenhuma ramificação pode ser menor que 5% ou maior que 40%.

O comprimento deve ser calculado considerando a extensão horizontal da ramificação dentro do nível, desde seu ponto de origem até sua reconexão com a rota principal.

3. Conexão das ramificações

- Toda ramificação deve começar em um caminho principal do próprio nível.
- Toda ramificação deve terminar reconectando-se a outro trecho caminhável do mesmo nível.
- Não podem existir ramificações isoladas.
- Não podem existir ramificações que terminem abruptamente.
- As ramificações devem oferecer trajetórias alternativas reais.
- O jogador deve conseguir escolher entre diferentes percursos sem precisar mudar de nível.
- As ramificações devem fazer parte da rede contínua de circulação.

4. Distribuição das ramificações

- Distribuir ramificações em diferentes regiões de cada nível.
- Evitar concentrar todas as ramificações em um único ponto.
- Variar seus comprimentos, respeitando os limites de 5% a 40%.
- Utilizar geometrias variadas, como retângulos, quadrados, rampas e plataformas combinadas.
- Criar bifurcações e reconexões que produzam caminhos alternativos interessantes.

5. REGRA DE PRIORIDADE MÁXIMA

As ramificações internas não podem ser confundidas com conexões entre os níveis.

Cada nível deve possuir sua própria rede de ramificações independentes.

O Nível 1 deve possuir alternativas de circulação próprias, assim como o Nível 2.

As únicas conexões entre essas duas redes são as duas paredes escaláveis localizadas nas extremidades esquerda e direita.

RESUMO OBRIGATÓRIO:

- Ramificações permanecem no nível de origem.
- Comprimento mínimo de 5% do nível.
- Comprimento máximo de 40% do nível.
- Toda ramificação deve se reconectar ao próprio nível.
- Nenhum caminho sem saída.
- Nenhuma ramificação pode criar uma conexão adicional entre os níveis.
