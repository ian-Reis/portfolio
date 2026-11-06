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
- **Mapa de skills.** Sistemas → dados → decisão, mais a trilha de jogos. Constrói-se conforme a rolagem
  (e desfaz se você subir). Passar o mouse, focar ou tocar acende o caminho inteiro; os pontos de dados
  aceleram nele. Clicar abre um painel com o que a skill abrange, o trabalho público que a comprova (quando
  existe) e as skills conectadas. No celular o painel é uma folha que sobe da base da tela.
- **Work.** Lista curada de repositórios. Do GitHub vêm, ao vivo: data do último push, barra de
  linguagens, linha do tempo com o último push de cada repositório e, ao passar o mouse, a última
  mensagem de commit.
- **Games.** Os três jogos do itch.io; ao passar o mouse aparece a capa.
- **Menu de comandos** (Ctrl K, ⌘ K ou `/`): navegar, trocar tema e idioma, copiar e-mail, modo
  inspeção, imprimir currículo, abrir GitHub e itch.io.
- **Modo inspeção.** Mostra o grid de 12 colunas e o nome de cada componente da página.
- **Imprimir currículo.** Ao imprimir (ou salvar como PDF) a página vira um currículo de duas páginas,
  com os links escritos por extenso.
- **Detalhes.** Barra de progresso de leitura, indicador deslizante no menu, linhas de seção que se
  desenham, sublinhados que varrem, copiar e-mail com confirmação, imagem de compartilhamento
  (`assets/images/og.png`).

Tudo respeita `prefers-reduced-motion`: sem animações de entrada nem pontos em movimento; as
interações continuam. Sem JavaScript, a página aparece completa em inglês.

## Estrutura

```
index.html                → conteúdo (em inglês) e estrutura
assets/css/fonts.css      → @font-face das fontes hospedadas aqui
assets/css/site.css       → tokens dos dois temas, layout, movimento, impressão
assets/js/i18n.js         → traduções PT, textos do painel e dos comandos
assets/js/site.js         → todo o comportamento, em módulos isolados
assets/fonts/             → Geist e Geist Mono (variáveis, subset latin, licença OFL)
assets/images/games/      → capas dos jogos (do itch.io)
assets/images/og.png      → imagem de compartilhamento 1200×630
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

**Work.** `<li class="repo" data-repo="nome-do-repo">` em `index.html`. A data, a barra de linguagens,
a linha do tempo e a prévia de commit vêm da API pública do GitHub, com cache de 6 horas no navegador.
Se a API falhar, a lista continua completa.

## Publicar

Já está no GitHub Pages: basta fazer push para `main` do repositório `ian-Reis/portfolio`.

## Conteúdo a revisar

- **PDV:** "PVD" foi lido como PDV (ponto de venda).
- **Textos do painel de skills** (`skills` em `i18n.js`): descrevem o que cada área abrange. Ajuste o que
  não refletir o seu trabalho.
- Confirme o Discord (`ian.reis_`) e o link do Fiverr (só um link de texto no contato).

## Medições

Lighthouse 12, servidor local: desktop 100 / 100 / 100 / 100; mobile 97 / 100 / 100 / 100
(performance / acessibilidade / boas práticas / SEO). Cerca de 168 KiB na primeira visita.
