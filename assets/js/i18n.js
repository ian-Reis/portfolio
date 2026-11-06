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
    'hero.lead': 'Sou Ian Reis. Desenvolvo sistemas de gestão, software de PDV e APIs RESTful, e transformo os dados deles em análise, BI e dashboards. Também crio jogos em Godot e Roblox.',
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
    'n.game.d': 'Protótipos, gameplay e ferramentas',
    'panel.close': 'Fechar',
    'panel.work': 'Trabalho público',
    'panel.related': 'Habilidades conectadas',
    'work.title': 'Trabalho',
    'work.note': 'Repositórios públicos no <a href="https://github.com/ian-Reis?tab=repositories" target="_blank" rel="noopener">GitHub</a>.',
    'work.langs': 'Linguagens nos repositórios públicos',
    'work.timeline': 'Último push de cada repositório',
    'work.all': 'Ver todos os repositórios no GitHub',
    'r.agentic': 'Um plugin para o Claude Code que monta um fluxo de trabalho multiagente baseado em arquivos. Um agente planeja, os outros executam a partir de uma fila e comprovam o trabalho com relatórios.',
    'r.iansec': 'Um cofre de senhas pessoal que roda offline no terminal. Sem servidor, sem nuvem.',
    'r.chapterbind': 'Junta arquivos de capítulos de novels ou mangás em um único PDF, EPUB ou CBZ, na ordem certa.',
    'r.fastapi': 'Um projeto em FastAPI para aprender design de APIs RESTful.',
    'r.todo': 'Uma API web de lista de tarefas feita em C#.',
    'r.bookloan': 'Um app de empréstimo de livros feito com ASP.NET Core MVC.',
    'games.title': 'Jogos',
    'games.note': 'Feitos em Godot e publicados no <a href="https://ian-reis.itch.io/" target="_blank" rel="noopener">itch.io</a>.',
    'g.cozy': 'Um protótipo de corrida. Roda no navegador.',
    'g.gobot': 'Um jogo de plataforma 3D. Roda no navegador.',
    'g.tsundoku': 'Um downloader e leitor de mangás, webcomics e novels.',
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
    'foot.print': 'Imprimir currículo',
    'palette.label': 'Menu de comandos',
    'palette.placeholder': 'Digite um comando…',
    'palette.hint': '↑ ↓ para navegar · Enter para executar · Esc para fechar',
    'inspect.badge': 'Modo inspeção: grid de 12 colunas, 1200px, Esc para sair',
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
      'timeline.repo': 'repository', 'timeline.repos': 'repositories',
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
      'timeline.repo': 'repositório', 'timeline.repos': 'repositórios',
    },
  };

  // what each skill covers (shown in the panel); links point to real public work only
  const skills = {
    en: {
      api: 'Designing and building HTTP APIs that other systems can rely on: clear resources, predictable status codes, validation and documentation. They are the glue between a point of sale, a management system and the analysis that comes after.',
      mgmt: 'Software that runs a business day to day: registrations, stock, orders, finance and the reports people check every morning. The focus is on workflows that match how the team actually works.',
      pdv: 'Point-of-sale software for the counter: products and prices, checkout, payments and receipts. Every sale becomes reliable data for stock, finance and analysis.',
      data: 'Cleaning, joining and exploring data with Python to answer concrete questions: what sells, when, and why. The result is numbers someone can act on, not just charts.',
      bi: 'Organising a business’s data into indicators tracked over time: sales, margins, stock turnover, goals. BI connects what the systems record with the decisions people make.',
      dash: 'Dashboards that show the few numbers that matter, readable at a glance, with the detail one click away.',
      csharp: 'C# for gameplay code and tools in Godot, and for web APIs and MVC apps with .NET.',
      luau: 'Luau, the scripting language of Roblox, for game logic, interface and server-side rules.',
      godot: 'Godot is the engine behind every published game here: Cozy Kart, Gobot and Tsundoku.',
      roblox: 'Roblox experiences built in Luau, from gameplay to interface.',
      game: 'Prototypes, gameplay systems and tools, from the first idea to something people can play in the browser.',
    },
    pt: {
      api: 'Projetar e construir APIs HTTP em que outros sistemas podem confiar: recursos claros, códigos de status previsíveis, validação e documentação. São a cola entre o PDV, o sistema de gestão e a análise que vem depois.',
      mgmt: 'Software que roda o negócio no dia a dia: cadastros, estoque, pedidos, financeiro e os relatórios que a equipe consulta toda manhã. O foco é em fluxos que acompanham como a equipe realmente trabalha.',
      pdv: 'Software de ponto de venda para o balcão: produtos e preços, checkout, pagamentos e comprovantes. Cada venda vira um dado confiável para estoque, financeiro e análise.',
      data: 'Limpar, cruzar e explorar dados com Python para responder perguntas concretas: o que vende, quando e por quê. O resultado são números em que alguém pode agir, não só gráficos.',
      bi: 'Organizar os dados do negócio em indicadores acompanhados ao longo do tempo: vendas, margens, giro de estoque, metas. O BI liga o que os sistemas registram às decisões que as pessoas tomam.',
      dash: 'Dashboards que mostram os poucos números que importam, legíveis num relance, com o detalhe a um clique.',
      csharp: 'C# para gameplay e ferramentas no Godot, e para APIs web e apps MVC com .NET.',
      luau: 'Luau, a linguagem de script do Roblox, para lógica de jogo, interface e regras no servidor.',
      godot: 'Godot é a engine por trás de todos os jogos publicados aqui: Cozy Kart, Gobot e Tsundoku.',
      roblox: 'Experiências no Roblox feitas em Luau, do gameplay à interface.',
      game: 'Protótipos, sistemas de gameplay e ferramentas, da primeira ideia até algo que as pessoas jogam no navegador.',
    },
  };
  const gh = (name) => ({ label: name, href: `https://github.com/ian-Reis/${name}` });
  const itch = (label, slug) => ({ label, href: `https://ian-reis.itch.io/${slug}` });
  const games = [itch('Cozy Kart', 'cozy-kart'), itch('Gobot', 'gobot'), itch('Tsundoku', 'tsundoku')];
  const work = {
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
