# trabalho-web

# Shadow Duel Samurai

Bem-vindo ao **Shadow Duel Samurai**, um jogo de luta 2D imersivo para web onde os jogadores se enfrentam em intensos combates de samurais.

## Como Jogar

### Objetivo
Derrote seu oponente acertando golpes precisos e esgotando a barra de vida dele antes que ele derrote você!

### Controles (Padrão)
*(Nota: Você pode atualizar isso neste arquivo se o seu `game.js` usar teclas diferentes)*
* **Jogador 1:**
  * **Movimento:** `W`, `A`, `S`, `D` 
  * **Ataque:** `Espaço` ou `F`
* **Jogador 2:**
  * **Movimento:** `Setas` (Cima, Esquerda, Baixo, Direita)
  * **Ataque:** `Enter` ou `Shift`

## Instalação e Configuração

Como o jogo é construído puramente com tecnologias web, não há necessidade de instalação complicada ou configuração de servidor.
1. Baixe ou extraia os arquivos do jogo (o arquivo zip `Shadow Duel Samurai.zip`) para o seu computador.
2. Navegue até a pasta `Shadow Duel Samurai/Game/`.
3. Dê um duplo clique no arquivo `index.html` para abri-lo em qualquer navegador web moderno (Chrome, Firefox, Edge, Safari).
4. Comece a duelar!

## Estrutura do Projeto

O projeto está organizado em uma estrutura padrão e limpa para jogos web:

* `index.html` - A página web principal que carrega o *canvas* do jogo e as interfaces.
* `style.css` - Responsável pelo layout, estilo visual e interface sobreposta para a tela do jogo.
* `game.js` - Contém a lógica principal do jogo, física, controles dos jogadores e mecânicas de vida.
* `assets/` - A pasta contendo os arquivos de mídia do jogo:
  * `bg.jpg` - A imagem de fundo atmosférica que compõe o cenário do duelo.
  * `sfx/` - Contém uma variedade de efeitos sonoros dinâmicos de ataques e impactos (`punch1.wav` a `punch5.mp3`) que são acionados durante o combate.

##  Tecnologias Utilizadas
* **HTML5 Canvas:** Para renderizar o mundo do jogo, fundos e personagens.
* **JavaScript (Vanilla):** Controla o *loop* principal do jogo, o estado, a reprodução de áudio e a detecção de colisões.
* **CSS3:** Para a estilização e formatação contínua da interface.
