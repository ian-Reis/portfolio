/* Ian Reis — translations.
   English lives in the HTML (so the page works without JS). On first run the English text of every
   [data-i18n*] element is captured as the base; Portuguese overrides it. Keys used only by site.js
   (panel, command menu, toasts) are defined here in both languages.
   Loaded synchronously at the end of <body>, so a Portuguese page is translated before first paint. */
window.I18N = (() => {
  'use strict';

  const pt = {
    'meta.title': 'Ian Reis — Engenheiro de Software',
    skip: 'Pular para o conteúdo',
    'nav.label': 'Seções',
    'nav.skills': 'Habilidades',
    'nav.work': 'Trabalho',
    'nav.games': 'Jogos',
    'nav.contact': 'Contato',
    'palette.open': 'Abrir menu de comandos',
    'theme.label': 'Tema escuro',
    'hero.sr': 'Ian Reis, engenheiro de software.',
    'hero.l1': 'Engenheiro',
    'hero.l2': 'de software.',
    status: 'Aberto para comissões e serviços',
    'status.full': 'Aberto para comissões e serviços.',
    'hero.lead': 'Sou Ian Reis, freelancer há cerca de quatro anos. Construo sistemas do zero: software de gestão e de PDV, APIs, automações e a análise de dados por trás deles. Também crio jogos em Godot e Roblox, e trabalho em português e inglês.',
    'cta.github': 'Ver meu GitHub',
    'cta.email': 'Enviar e-mail',
    'skills.title': 'Habilidades',
    'skills.note': 'Selecione uma habilidade para ver o que ela conecta e o que abrange.',
    'map.main': 'Sistemas de negócio e dados',
    'map.games': 'Jogos, como extra',
    'map.legend': 'As linhas mostram o que alimenta o quê',
    'n.api': 'APIs RESTful',
    'n.api.d': 'Serviços que conectam sistemas',
    'n.mgmt': 'Sistemas de gestão',
    'n.mgmt.d': 'O software da operação diária',
    'n.pdv': 'PDV (ponto de venda)',
    'n.pdv.d': 'Software para o balcão de vendas',
    'n.data': 'Análise de dados',
    'n.data.d': 'Python, do dado bruto à resposta',
    'n.bi': 'Business intelligence',
    'n.bi.d': 'Dados que viram decisões',
    'n.dash': 'Dashboards',
    'n.dash.d': 'Métricas legíveis num relance',
    'n.csharp.d': 'Gameplay e ferramentas',
    'n.luau.d': 'Scripts para Roblox',
    'n.godot.d': 'Engine de jogos open source',
    'n.roblox.d': 'Experiências em Luau',
    'n.game': 'Desenvolvimento de jogos',
    'n.game.d': 'Sistemas sob medida, multiplayer, protótipos',
    'map.auto': 'Automação e ferramentas de IA',
    'n.python.d': 'Automação e ferramentas de linha de comando',
    'n.n8n.d': 'Fluxos entre serviços',
    'n.claude.d': 'Skills, plugins, prompts e MCP',
    'n.auto': 'Automação',
    'n.auto.d': 'Trabalho repetitivo, feito por software',
    'n.gdscript.d': 'A linguagem do próprio Godot',
    'panel.close': 'Fechar',
    'panel.work': 'Trabalho público',
    'panel.related': 'Habilidades conectadas',
    'work.title': 'Trabalho',
    'work.note': 'Repositórios públicos no <a href="https://github.com/ian-Reis?tab=repositories" target="_blank" rel="noopener">GitHub</a>.',
    'work.langs': 'Linguagens nos repositórios públicos',
    'act.label': 'Contribuições no último ano, incluindo repositórios privados',
    'act.less': 'Menos',
    'act.more': 'Mais',
    'work.all': 'Ver todos os repositórios no GitHub',
    'r.agentic': 'Um plugin para o Claude Code que monta um fluxo de trabalho multiagente baseado em arquivos. Um agente planeja, os outros executam a partir de uma fila e comprovam o trabalho com relatórios.',
    'r.iansec': 'Um cofre de senhas pessoal que roda offline no terminal. Sem servidor, sem nuvem.',
    'r.chapterbind': 'Junta arquivos de capítulos de novels ou mangás em um único PDF, EPUB ou CBZ, na ordem certa.',
    'r.fastapi': 'Um projeto em FastAPI para aprender design de APIs RESTful.',
    'r.todo': 'Uma API web de lista de tarefas feita em C#.',
    'r.bookloan': 'Um app de empréstimo de livros feito com ASP.NET Core MVC.',
    'games.title': 'Jogos',
    'games.note': 'Feitos em Godot e publicados no <a href="https://ian-reis.itch.io/" target="_blank" rel="noopener">itch.io</a>.',
    'g.cozy': 'Um protótipo de corrida com pistas procedurais e física de kart própria. Roda no navegador.',
    'g.gobot': 'Um jogo de plataforma 3D. Roda no navegador.',
    'g.tsundoku': 'Um downloader e leitor de mangás e light novels, com uma toolchain em Python por trás.',
    'g.prototype': 'Protótipo',
    'g.released': 'Lançado',
    'g.indev': 'Em desenvolvimento',
    'contact.title': 'Contato',
    'contact.lead': 'E-mail é o jeito mais rápido de falar comigo. Meu código está no GitHub.',
    'contact.fiverr': 'Freelance no Fiverr',
    'copy.label': 'Copiar endereço de e-mail',
    'copy.short': 'Copiar',
    'foot.palette': 'Comandos',
    'foot.inspect': 'Inspecionar layout',
    'foot.overview': 'Visão geral',
    'foot.print': 'Imprimir currículo',
    'palette.label': 'Menu de comandos',
    'palette.placeholder': 'Digite um comando…',
    'palette.hint': '↑ ↓ para navegar · Enter para executar · Esc para fechar · ? para atalhos',
    'inspect.badge': 'Modo inspeção: grid de 12 colunas, 1200px, Esc para sair',

    // full index
    'ix.title': 'Índice completo',
    'ix.note': 'Tudo com que eu trabalho, e o que estou estudando agora.',
    'ix.filter': 'Filtrar o índice',
    'ix.all': 'Tudo',
    'ix.practice': 'Na prática',
    'ix.study': 'Estudando',
    'ix.studying': 'estudando',
    'ix.g.arch': 'Arquitetura de software',
    'ix.arch': 'Arquitetura de software',
    'ix.scratch': 'Criação de sistemas do zero',
    'ix.eda': 'Arquitetura event-driven',
    'ix.pubsub': 'Pub/Sub e message brokers',
    'ix.micro': 'Microsserviços vs. monólito modular',
    'ix.layers': 'Arquitetura em camadas, MVC, MVVM',
    'ix.di': 'Injeção de dependência / IoC',
    'ix.solid': 'Princípios SOLID',
    'ix.gof': 'Design patterns GoF',
    'ix.components': 'Arquitetura baseada em componentes',
    'ix.components.d': 'desacoplada por sinais',
    'ix.g.back': 'Back-end e APIs',
    'ix.fastapi.d': 'REST, boas práticas, otimização de tráfego',
    'ix.sql.d': 'junto com o FastAPI',
    'ix.redis': 'Cache',
    'ix.idem': 'Idempotência e retry',
    'ix.g.data': 'Dados e automação',
    'ix.python.d': 'automação e ferramentas de linha de comando',
    'ix.n8n.d': 'automação de fluxos',
    'ix.analysis': 'Análise de dados',
    'ix.tsundoku': 'Toolchain para mangás e light novels',
    'ix.g.algo': 'Algoritmos e estruturas de dados',
    'ix.queues': 'Filas, pilhas, hash maps',
    'ix.linked': 'Listas ligadas',
    'ix.heap': 'Deque, fila de prioridade, heap',
    'ix.trees': 'Árvores binárias, BST, AVL, rubro-negra',
    'ix.graphs': 'Grafos: BFS, DFS',
    'ix.bigo': 'Notação Big-O e análise de complexidade',
    'ix.sorting': 'Algoritmos de ordenação',
    'ix.bsearch': 'Busca binária',
    'ix.dp': 'Programação dinâmica',
    'ix.recursion': 'Recursão e backtracking',
    'ix.concurrency': 'Concorrência',
    'ix.concurrency.d': 'threads, locks, async/await, race conditions',
    'ix.g.ai': 'IA e ferramentas de desenvolvimento',
    'ix.agents': 'Skills e plugins para agentes de IA',
    'ix.mcp': 'Claude Code com o MCP do Roblox Studio',
    'ix.prompts': 'Prompts estruturados para o Claude Code',
    'ix.studiolinux': 'Roblox Studio no Linux',
    'ix.asphalt': 'Upload de assets para o Roblox',
    'ix.g.games': 'Desenvolvimento de jogos',
    'ix.godot.d': 'GDScript e C#',
    'ix.unreal': 'C++ com Unreal Engine',
    'ix.gamesys': 'Sistemas de jogo sob medida',
    'ix.authoritative': 'Cliente-servidor autoritativo',
    'ix.netcode.d': 'predição no cliente, reconciliação, interpolação',
    'ix.fsm': 'Máquinas de estado finitas',
    'ix.services': 'Serviços reutilizáveis entre jogos',
    'ix.services.d': 'economia, anúncios',
    'ix.procedural': 'Pistas procedurais e física de kart',
    'ix.prototypes': 'Protótipos de jogos',
    'ix.bugs': 'Correção de bugs',
    'ix.g.sys': 'Linux, sistemas e hardware',
    'ix.arch.linux': 'Arch Linux / CachyOS com Hyprland',
    'ix.gpu': 'Configuração de GPU',
    'ix.ssd': 'SSD externo com UASP',
    'ix.wifi': 'Auditoria de segurança Wi-Fi',
    'ix.emu': 'Troubleshooting de emuladores',
    'ix.firmware': 'Flash de firmware e troubleshooting de hardware',
    'ix.g.study': 'Estudando agora',
    'ix.cpu': 'Arquitetura de CPU',
    'ix.turing': 'Turing-completude',
    'ix.mcu': 'Microcontroladores',
    'ix.llm': 'IA e LLMs',
    'ix.g.pro': 'Freelance e idiomas',
    'ix.freelance': 'Freelancer há cerca de 4 anos',
    'ix.fiverr': 'Otimização de gigs no Fiverr',
    'ix.fiverr.d': 'SEO e copy em inglês',
    'ix.pt': 'Português nativo',
    'ix.en': 'Inglês para o mercado internacional',
  };

  // strings that exist only in JavaScript
  const js = {
    en: {
      'rel.fed': 'Fed by', 'rel.feeds': 'Feeds', 'rel.and': 'and',
      'updated': 'Updated', 'commit.last': 'Last commit', 'commit.loading': 'Loading last commit…', 'commit.none': 'No commit message available',
      'stars.one': 'star', 'stars.many': 'stars', 'other': 'Other',
      'toast.copied': 'Email copied', 'toast.copyFail': 'Copy failed. The address is erickian2007@gmail.com',
      'toast.inspectOn': 'Inspect mode on. Esc to exit', 'toast.dark': 'Dark theme', 'toast.light': 'Light theme', 'toast.lang': 'English',
      'lang.switch': 'Mudar para português', 'theme.toDark': 'Switch to dark theme', 'theme.toLight': 'Switch to light theme',
      'cmd.group.go': 'Go to', 'cmd.group.do': 'Actions', 'cmd.group.open': 'Open',
      'cmd.top': 'Top', 'cmd.skills': 'Skills', 'cmd.work': 'Work', 'cmd.games': 'Games', 'cmd.contact': 'Contact',
      'cmd.theme': 'Toggle dark theme', 'cmd.lang': 'Ver em português', 'cmd.copy': 'Copy email address',
      'cmd.inspect': 'Toggle inspect mode', 'cmd.print': 'Print résumé / save as PDF',
      'cmd.github': 'GitHub profile', 'cmd.itch': 'itch.io page', 'cmd.mail': 'Write an email', 'cmd.empty': 'No matching command',
      'cmd.group.skills': 'Skill index', 'cmd.index': 'Full skill index',
      'act.total': '{n} contributions on {d} days', 'act.one': '1 contribution', 'act.many': '{n} contributions', 'act.none': 'No contributions',
      'act.aria': '{n} contributions in the last year, on {d} active days. Busiest month: {m}.',
      'act.month': '{m}: {n} contributions',
      'cmd.keys': 'Keyboard shortcuts',
      'keys.palette': 'Open or close this menu',
      'keys.slash': 'Open this menu',
      'keys.help': 'Show these shortcuts',
      'keys.esc': 'Close menus, clear the selected skill, leave inspect mode',
      'keys.nav': 'Move through the menu and run a command',
      'keys.overview': 'See the whole page at once',
      'keys.lantern': 'Hold the theme switch and drag to look through the other theme',
      'cmd.overview': 'Overview: the whole page at once',
      'cmd.bgInk': 'Hero background: ink', 'cmd.bgHole': 'Hero background: black hole',
      'ov.label': 'Page overview', 'ov.hint': 'Click a section to go there · Esc to go back', 'ov.go': 'Go to {s}',
      'ov.top': 'Start',
      'city.grid': 'Grid', 'city.city': 'City', 'city.toggle': 'Show contributions as',
      'city.hint': 'Drag to orbit · double-click to reset · one building per day, its height is the number of contributions', 'city.aria': '3D city of contributions, one building per day',
    },
    pt: {
      'rel.fed': 'Recebe de', 'rel.feeds': 'Alimenta', 'rel.and': 'e',
      'updated': 'Atualizado em', 'commit.last': 'Último commit', 'commit.loading': 'Carregando o último commit…', 'commit.none': 'Mensagem de commit indisponível',
      'stars.one': 'estrela', 'stars.many': 'estrelas', 'other': 'Outras',
      'toast.copied': 'E-mail copiado', 'toast.copyFail': 'Não foi possível copiar. O endereço é erickian2007@gmail.com',
      'toast.inspectOn': 'Modo inspeção ativo. Esc para sair', 'toast.dark': 'Tema escuro', 'toast.light': 'Tema claro', 'toast.lang': 'Português',
      'lang.switch': 'Switch to English', 'theme.toDark': 'Mudar para o tema escuro', 'theme.toLight': 'Mudar para o tema claro',
      'cmd.group.go': 'Ir para', 'cmd.group.do': 'Ações', 'cmd.group.open': 'Abrir',
      'cmd.top': 'Topo', 'cmd.skills': 'Habilidades', 'cmd.work': 'Trabalho', 'cmd.games': 'Jogos', 'cmd.contact': 'Contato',
      'cmd.theme': 'Alternar tema escuro', 'cmd.lang': 'View in English', 'cmd.copy': 'Copiar endereço de e-mail',
      'cmd.inspect': 'Alternar modo inspeção', 'cmd.print': 'Imprimir currículo / salvar em PDF',
      'cmd.github': 'Perfil no GitHub', 'cmd.itch': 'Página no itch.io', 'cmd.mail': 'Escrever um e-mail', 'cmd.empty': 'Nenhum comando encontrado',
      'cmd.group.skills': 'Índice de habilidades', 'cmd.index': 'Índice completo de habilidades',
      'act.total': '{n} contribuições em {d} dias', 'act.one': '1 contribuição', 'act.many': '{n} contribuições', 'act.none': 'Nenhuma contribuição',
      'act.aria': '{n} contribuições no último ano, em {d} dias com atividade. Mês mais ativo: {m}.',
      'act.month': '{m}: {n} contribuições',
      'cmd.keys': 'Atalhos de teclado',
      'keys.palette': 'Abrir ou fechar este menu',
      'keys.slash': 'Abrir este menu',
      'keys.help': 'Mostrar estes atalhos',
      'keys.esc': 'Fechar menus, limpar a habilidade selecionada, sair do modo inspeção',
      'keys.nav': 'Navegar pelo menu e executar um comando',
      'keys.overview': 'Ver a página inteira de uma vez',
      'keys.lantern': 'Segure o botão de tema e arraste para olhar pelo outro tema',
      'cmd.overview': 'Visão geral: a página inteira de uma vez',
      'cmd.bgInk': 'Fundo do topo: tinta', 'cmd.bgHole': 'Fundo do topo: buraco negro',
      'ov.label': 'Visão geral da página', 'ov.hint': 'Clique numa seção para ir até ela · Esc para voltar', 'ov.go': 'Ir para {s}',
      'ov.top': 'Início',
      'city.grid': 'Grade', 'city.city': 'Cidade', 'city.toggle': 'Mostrar contribuições como',
      'city.hint': 'Arraste para girar · duplo clique para voltar · um prédio por dia, a altura é o número de contribuições', 'city.aria': 'Cidade 3D das contribuições, um prédio por dia',
    },
  };

  // what each skill covers (shown in the panel); links point to real public work only
  const skills = {
    en: {
      api: 'Designing and building HTTP APIs that other systems can rely on: clear resources, predictable status codes, validation and documentation, plus caching with Redis, idempotency and retries, rate limiting and API gateways. Currently studying FastAPI and SQL in depth.',
      python: 'Python for automation and command-line tools: small programs that do one job well, like Chapterbind, which merges manga and novel chapters into one book, or IAN-SEC, an offline password vault. It is also the language of the data analysis.',
      n8n: 'N8N to connect services into automated workflows, for example messaging through Evolution API with the data kept in PostgreSQL.',
      claude: 'Claude Code as a working tool: structured prompts, skills and plugins for AI agents, and the Roblox Studio MCP to work inside Studio. agentic-flow is a plugin built this way.',
      auto: 'Taking repetitive work off people: scripts, command-line tools, workflows between services and AI agents that follow a written process.',
      gdscript: 'GDScript, the language built into Godot, for fast iteration on gameplay and tools.',
      mgmt: 'Software that runs a business day to day: registrations, stock, orders, finance and the reports people check every morning. The focus is on workflows that match how the team actually works.',
      pdv: 'Point-of-sale software for the counter: products and prices, checkout, payments and receipts. Every sale becomes reliable data for stock, finance and analysis.',
      data: 'Cleaning, joining and exploring data with Python to answer concrete questions: what sells, when, and why. The result is numbers someone can act on, not just charts.',
      bi: 'Organising a business’s data into indicators tracked over time: sales, margins, stock turnover, goals. BI connects what the systems record with the decisions people make.',
      dash: 'Dashboards that show the few numbers that matter, readable at a glance, with the detail one click away.',
      csharp: 'C# for gameplay code and tools in Godot, and for web APIs and MVC apps with .NET.',
      luau: 'Luau, the scripting language of Roblox, for game logic, interface and server-side rules.',
      godot: 'Godot 4 with GDScript and C#: component-based architecture decoupled with signals, finite state machines and custom systems. It is the engine behind Cozy Kart, with procedural tracks and kart physics, Gobot and Tsundoku.',
      roblox: 'Roblox with Luau, developed from Linux with Vinegar, Rojo and Azul, assets uploaded with Asphalt CLI, and Claude Code connected to Roblox Studio through MCP.',
      game: 'Custom game systems built from scratch, multiplayer with an authoritative server and netcode (client prediction, reconciliation, interpolation), ECS, prototypes, bug fixing, and services reused across games such as economy and ads.',
    },
    pt: {
      api: 'Projetar e construir APIs HTTP em que outros sistemas podem confiar: recursos claros, códigos de status previsíveis, validação e documentação, além de cache com Redis, idempotência e retry, rate limiting e API gateways. Estudando FastAPI e SQL a fundo no momento.',
      python: 'Python para automação e ferramentas de linha de comando: programas pequenos que fazem bem uma coisa só, como o Chapterbind, que junta capítulos de mangás e novels em um livro, ou o IAN-SEC, um cofre de senhas offline. Também é a linguagem da análise de dados.',
      n8n: 'N8N para ligar serviços em fluxos automáticos, por exemplo mensagens pela Evolution API com os dados guardados em PostgreSQL.',
      claude: 'O Claude Code como ferramenta de trabalho: prompts estruturados, skills e plugins para agentes de IA, e o MCP do Roblox Studio para trabalhar dentro do Studio. O agentic-flow é um plugin feito assim.',
      auto: 'Tirar trabalho repetitivo das pessoas: scripts, ferramentas de linha de comando, fluxos entre serviços e agentes de IA que seguem um processo escrito.',
      gdscript: 'GDScript, a linguagem própria do Godot, para iterar rápido em gameplay e ferramentas.',
      mgmt: 'Software que roda o negócio no dia a dia: cadastros, estoque, pedidos, financeiro e os relatórios que a equipe consulta toda manhã. O foco é em fluxos que acompanham como a equipe realmente trabalha.',
      pdv: 'Software de ponto de venda para o balcão: produtos e preços, checkout, pagamentos e comprovantes. Cada venda vira um dado confiável para estoque, financeiro e análise.',
      data: 'Limpar, cruzar e explorar dados com Python para responder perguntas concretas: o que vende, quando e por quê. O resultado são números em que alguém pode agir, não só gráficos.',
      bi: 'Organizar os dados do negócio em indicadores acompanhados ao longo do tempo: vendas, margens, giro de estoque, metas. O BI liga o que os sistemas registram às decisões que as pessoas tomam.',
      dash: 'Dashboards que mostram os poucos números que importam, legíveis num relance, com o detalhe a um clique.',
      csharp: 'C# para gameplay e ferramentas no Godot, e para APIs web e apps MVC com .NET.',
      luau: 'Luau, a linguagem de script do Roblox, para lógica de jogo, interface e regras no servidor.',
      godot: 'Godot 4 com GDScript e C#: arquitetura baseada em componentes desacoplada por sinais, máquinas de estado finitas e sistemas sob medida. É a engine por trás do Cozy Kart, com pistas procedurais e física de kart, do Gobot e do Tsundoku.',
      roblox: 'Roblox com Luau, desenvolvido no Linux com Vinegar, Rojo e Azul, assets enviados com Asphalt CLI, e o Claude Code ligado ao Roblox Studio via MCP.',
      game: 'Sistemas de jogo sob medida feitos do zero, multiplayer com servidor autoritativo e netcode (predição no cliente, reconciliação, interpolação), ECS, protótipos, correção de bugs e serviços reutilizáveis entre jogos, como economia e anúncios.',
    },
  };
  const gh = (name) => ({ label: name, href: `https://github.com/ian-Reis/${name}` });
  const itch = (label, slug) => ({ label, href: `https://ian-reis.itch.io/${slug}` });
  const games = [itch('Cozy Kart', 'cozy-kart'), itch('Gobot', 'gobot'), itch('Tsundoku', 'tsundoku')];
  const work = {
    python: [gh('Chapterbind'), gh('IAN-SEC')],
    n8n: [gh('N8N-With-EvolutionAPI-And-PostgreSQL')],
    claude: [gh('agentic-flow')],
    auto: [gh('agentic-flow'), gh('Chapterbind'), gh('N8N-With-EvolutionAPI-And-PostgreSQL')],
    api: [gh('FastAPI-RESTful-Learning'), gh('TodoApi')],
    mgmt: [gh('Book-Loan-ASP.NET')],
    csharp: [gh('TodoApi'), gh('Book-Loan-ASP.NET')],
    godot: games,
    game: games,
  };

  const en = {};
  const root = document.documentElement;
  let lang = root.lang === 'pt-BR' ? 'pt' : 'en';

  // capture the English base from the DOM (the page ships in English)
  document.querySelectorAll('[data-i18n]').forEach((el) => { en[el.dataset.i18n] = el.textContent; });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { en[el.dataset.i18nHtml] = el.innerHTML; });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':');
      en[key] = el.getAttribute(attr);
    });
  });
  en['meta.title'] = document.title;

  const dict = () => (lang === 'pt' ? pt : en);
  const t = (key) => {
    const own = js[lang][key];
    if (own !== undefined) return own;
    const d = dict()[key];
    return d !== undefined ? d : (en[key] !== undefined ? en[key] : (js.en[key] !== undefined ? js.en[key] : key));
  };

  function apply() {
    root.lang = lang === 'pt' ? 'pt-BR' : 'en';
    document.title = t('meta.title');
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    // only our own static strings are injected as HTML (never data from the network)
    document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':');
        el.setAttribute(attr, t(key));
      });
    });
  }

  function set(next) {
    if (next !== 'en' && next !== 'pt') return;
    lang = next;
    try { localStorage.setItem('ir:lang', lang); } catch (e) { /* private mode */ }
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }

  if (lang === 'pt') apply();

  return {
    t,
    set,
    get lang() { return lang; },
    locale() { return lang === 'pt' ? 'pt-BR' : 'en-US'; },
    skill(id) { return (skills[lang] && skills[lang][id]) || skills.en[id] || ''; },
    work(id) { return work[id] || []; },
  };
})();
