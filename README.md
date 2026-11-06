# Portfolio — Ian Reis, software engineer

Site de portfólio estático (HTML, CSS e JavaScript puros, sem build e sem bibliotecas de terceiros).
O foco é **software engineering**; jogos aparecem como habilidade extra. A ação principal é o **GitHub**.

Publicado em <https://ian-reis.github.io/portfolio/>.

## O que a página faz

- **Tema claro e escuro.** Segue o sistema na primeira visita, lembra a escolha depois. A troca abre
  o tema novo como um círculo a partir do botão (View Transitions).
- **Português e inglês.** Escolhe pelo idioma do navegador e lembra a escolha. O texto em português é
  aplicado antes da primeira pintura, sem piscar.
- **Hero.** O título sobe de uma máscara enquanto o peso da fonte vai de 100 a 300. Depois, as letras
  ganham peso perto do cursor e uma luz suave acompanha o mouse sobre a grade de pontos.
- **Índice completo.** Todas as habilidades (74) em 9 grupos, com o que está em estudo marcado. Filtro
  "Tudo / Na prática / Estudando" e busca pelo menu de comandos (digite, por exemplo, "redis").
- **Mapa de skills.** Três trilhas: sistemas → dados → decisão; automação e ferramentas de IA; e jogos.
  Constrói-se conforme a rolagem
  (e desfaz se você subir). Passar o mouse, focar ou tocar acende o caminho inteiro; os pontos de dados
  aceleram nele. Clicar abre um painel com o que a skill abrange, o trabalho público que a comprova (quando
  existe) e as skills conectadas. No celular o painel é uma folha que sobe da base da tela.
- **Work.** Lista curada de repositórios. Do GitHub vêm, ao vivo: data do último push, barra de
  linguagens, linha do tempo com o último push de cada repositório e, ao passar o mouse, a última
  mensagem de commit.
- **Heatmap de contribuições** (inclui repositórios privados). Vem de `assets/data/activity.json`, que a
  Action `.github/workflows/activity.yml` atualiza todo dia lendo o calendário público do seu perfil
  (com "Include private contributions on my profile" ativo, ele já soma os privados como totais por
  dia; nenhum nome, código ou mensagem de commit privado é exposto, e nenhum token é necessário). Para
  atualizar na hora: aba **Actions → Update contribution activity → Run workflow**, ou localmente
  `node scripts/fetch-activity.mjs`.
- **Games.** Os três jogos do itch.io; ao passar o mouse aparece a capa.
- **Menu de comandos** (Ctrl K, ⌘ K ou `/`): navegar, trocar tema e idioma, copiar e-mail, modo
  inspeção, imprimir currículo, abrir GitHub e itch.io.
- **Modo inspeção.** Mostra o grid de 12 colunas e o nome de cada componente da página.
- **Imprimir currículo.** Ao imprimir (ou salvar como PDF) a página vira um currículo de duas páginas,
  com os links escritos por extenso.
- **Detalhes.** Barra de progresso de leitura, indicador deslizante no menu, linhas de seção que se
  desenham, copiar e-mail com confirmação, imagem de compartilhamento (`assets/images/og.png`).

### Movimento com origem (a mesma família da troca de tema)

Tudo nasce de onde a pessoa agiu, num gesto só, com a mesma curva:

- **Skill → painel:** o cartão clicado cresce e vira o painel; ao fechar, o painel encolhe de volta nele.
- **Idioma:** o texto visível sai para cima e o novo idioma entra por baixo, em cascata, como um placar.
- **Filtro do índice:** cada item desliza até o novo lugar; a página abaixo sobe suavemente.
- **Menu de comandos:** nasce do botão que o abriu e se recolhe nele. `?` mostra os atalhos.
- **Modo inspeção:** uma linha de varredura desce revelando o grid e sobe para tirá-lo.
- **Fio condutor:** uma linha na margem (telas ≥ 1100 px) liga todas as seções; cada título é uma porta
  que acende quando você passa, com um ponto vivo na frente da leitura.
- **Cursor:** sublinhados nascem do lado por onde o mouse entrou, a linha das linhas de repositório se abre
  a partir do cursor, e cada clique deixa um anel fino.
- **Heatmap:** mira de semana e dia da semana no hover, com o total do mês; contadores que rolam.
- **Títulos:** uma onda de peso percorre cada título de seção ao aparecer; o logo vira "IR" ao rolar.
- **404:** página própria com uma ligação partida; o botão volta ao site pelo mesmo círculo da troca de tema
  (View Transitions entre páginas).
- **Acabamentos:** ícone da aba acompanha o tema; carregamento com brilho suave no lugar de espaço vazio.

### Efeitos (`assets/js/fx/`, sem bibliotecas)

Cada efeito é um módulo ES carregado sob demanda; se um falhar ou o navegador não tiver suporte, a página
continua igual sem ele.

- **Buraco negro no hero** (`blackhole.js`, WebGL2, desktop; fundo padrão): feito do zero, sem modelo nem
  textura. Cada pixel traça um raio de luz pelo espaço-tempo de Schwarzschild; o raio pega luz ao cruzar o
  disco de acreção (rotação kepleriana, efeito Doppler, desvio gravitacional para o vermelho) e, ao escapar,
  cai na própria grade de pontos da página, que aparece curvada pela gravidade. Tema claro: tinta sobre papel;
  tema escuro: disco brilhante na cor de destaque, com estrelas. O cursor inclina a vista e puxa o buraco de
  leve; segurar o clique no fundo o alimenta (cresce) e soltar manda uma onda gravitacional pela grade.
  Compila o shader sem travar a página e reduz a resolução sozinho se os quadros ficarem lentos.
  Menu de comandos: "Fundo do topo: tinta" troca para a tinta (a escolha fica salva).
- **Tinta no hero** (`fluid.js`, WebGL2, desktop; alternativa ao buraco negro): simulação de fluido atrás do título. As letras são
  sólidas, então a tinta contorna o texto; o mouse mexe, correntes lentas mantêm vivo, e a troca de tema
  derrama um anel de tinta a partir do botão. Pausa fora da tela, com a aba oculta e na visão geral.
- **Lanterna de tema** (em `site.js`): segure o botão de tema e arraste. Um círculo mostra a página no outro
  tema; solte longe do botão para o tema se espalhar a partir do círculo, ou solte nele para só espiar.
- **Título que derrete** (`morph.js`, WebGL2): na troca de idioma, os dois títulos viram campos de distância
  (transformada de distância exata, em JS) e um se funde no outro, com algumas colunas escorrendo.
  No celular só carrega quando o botão de idioma é tocado.
- **Algoritmos vivos** (`algos.js`, canvas 2D): cada item de "Algoritmos e estruturas de dados" do índice
  tem um ▶ que roda uma demonstração passo a passo, com dados reais quando existem: BFS/DFS no próprio mapa
  de skills, quicksort nas suas contribuições, busca binária nos nomes do índice. No celular abre como folha
  inferior.
- **Cidade das contribuições** (`city.js`, WebGL2, desktop): o heatmap vira uma cidade 3D, um prédio por
  dia (botão Grade / Cidade no cabeçalho do heatmap). Dia no tema claro, noite no escuro, com um
  pôr do sol curto na troca e janelas acesas conforme o trabalho do dia. Arraste para girar.
- **Visão geral** (`overview.js`, desktop): `Shift+O`, o menu de comandos ou o botão no rodapé. A câmera
  se afasta e cada seção vira uma prancheta, ligadas pelo mesmo fio da página; clique (ou setas + Enter)
  para voltar a uma delas com zoom. `Esc` volta para onde estava.

Módulos não essenciais iniciam quando o navegador fica ocioso, cada um em sua tarefa, para não bloquear a
primeira pintura; os efeitos de seções mais abaixo só carregam quando elas se aproximam da tela.

Tudo respeita `prefers-reduced-motion`: sem animações de entrada nem pontos em movimento; as
interações continuam. Sem JavaScript, a página aparece completa em inglês.

## Estrutura

```
index.html                → conteúdo (em inglês) e estrutura
assets/css/fonts.css      → @font-face das fontes hospedadas aqui
assets/css/site.css       → tokens dos dois temas, layout, movimento, impressão
assets/js/i18n.js         → traduções PT, textos do painel e dos comandos
assets/js/site.js         → todo o comportamento, em módulos isolados
assets/js/fx/             → efeitos opcionais (buraco negro, tinta, título, algoritmos, cidade, visão geral)
assets/fonts/             → Geist e Geist Mono (variáveis, subset latin, licença OFL)
assets/images/games/      → capas dos jogos (do itch.io)
assets/images/og.png      → imagem de compartilhamento 1200×630
assets/data/activity.json → contribuições por dia (gerado; não editar à mão)
scripts/fetch-activity.mjs → gera o activity.json a partir do calendário do GitHub
.github/workflows/activity.yml → roda o script todo dia e republica o site
```

## Rodar localmente

```
npx serve .
# ou
python -m http.server 8000
```

## Como editar

**Textos.** O inglês fica no HTML. Cada texto traduzível tem `data-i18n="chave"`; a versão em português
fica no objeto `pt` de `assets/js/i18n.js`, com a mesma chave.

**Mapa de skills.** Cada habilidade é um botão com `data-id`, `data-to` (quem ela alimenta) e
`data-stage` (coluna, de 0 a 3). Ligações, portas e texto para leitores de tela são gerados a partir
disso. O texto do painel fica em `skills` (EN e PT) e os links de trabalho público em `work`, ambos em
`i18n.js`.

**Índice completo.** Em `index.html`, dentro de `<div class="ix" id="index">`. Cada habilidade é um
`<li class="ix__item">` com `ix__name` e, opcionalmente, `ix__detail`. Para marcar como estudo, use
`data-status="study"` e acrescente `<span class="ix__tag" data-i18n="ix.studying">studying</span>`.
Contagens e filtro são automáticos. Para ligar uma demonstração a um item, use `data-algo` com uma das
chaves de `DEMOS` em `assets/js/fx/algos.js`.

**Work.** `<li class="repo" data-repo="nome-do-repo">` em `index.html`. A data, a barra de linguagens
e a prévia de commit vêm da API pública do GitHub, com cache de 6 horas no navegador.
Se a API falhar, a lista continua completa.

## Publicar

Já está no GitHub Pages: basta fazer push para `main` do repositório `ian-Reis/portfolio`.

## Conteúdo a revisar

- **PDV:** "PVD" foi lido como PDV (ponto de venda).
- **Análise de dados, BI, dashboards, PDV e sistemas de gestão** vieram da primeira lista de habilidades e
  continuam no site; a lista completa enviada depois não os citava.
- **Textos do painel de skills** (`skills` em `i18n.js`): descrevem o que cada área abrange. Ajuste o que
  não refletir o seu trabalho.
- Confirme o Discord (`ian.reis_`) e o link do Fiverr (só um link de texto no contato).

## Medições

Lighthouse 12, servidor local: desktop 100 / 100 / 100 / 100; mobile 92 / 100 / 100 / 100
(performance / acessibilidade / boas práticas / SEO). A nota de performance no mobile varia alguns pontos
com a carga da máquina: nas mesmas condições, a versão anterior às animações mediu o mesmo 92. Com os
efeitos de `fx/`: desktop 100 / 100 / 100 / 100; mobile 92 / 100 / 100 / 100 (duas medições seguidas).
Com o buraco negro: desktop 100 / 100 / 100 / 100 (duas medições), mobile 95 / 100 / 100 / 100. Numa GPU
integrada Intel UHD, cada quadro do buraco negro leva cerca de 6 ms (1x) e 12 ms (tela 2x).
