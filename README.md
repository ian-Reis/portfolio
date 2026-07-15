# Portfolio — Ian Reis

Site de portfólio (single-page, HTML/CSS puro) gerado a partir do design feito no Claude Design
(`Portfolio.dc.html`, projeto "Portfolio de game developer freelance").

## Estrutura

```
index.html            → site completo (sem dependências externas além do Google Fonts)
assets/images/         → coloque aqui os screenshots reais dos projetos
```

Os três cards em "Featured Projects" hoje mostram um placeholder listrado no lugar do
screenshot — veja `assets/images/README.md` para trocá-los por imagens reais.

## Rodar localmente

Não precisa de build nem de servidor: basta abrir `index.html` no navegador, ou usar
qualquer servidor estático simples, por exemplo:

```
npx serve .
```

## Publicar grátis

Qualquer host de arquivos estáticos funciona, já que é só um `index.html`. As opções mais
simples:

### GitHub Pages (recomendado — combina com o link do GitHub já no site)

1. Crie um repositório no GitHub (ex.: `ian-Reis/portfolio`) e suba esta pasta.
2. No repositório: **Settings → Pages → Source → branch `main`, pasta `/root`**.
3. O site fica em `https://ian-reis.github.io/portfolio/` (ou domínio custom depois, em
   **Settings → Pages → Custom domain**).

### Netlify (mais rápido — sem precisar de Git)

1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop).
2. Arraste esta pasta inteira para a página.
3. Pronto — Netlify gera uma URL pública na hora.

### Vercel / Cloudflare Pages

Ambos aceitam importar o mesmo repositório GitHub usado no passo do GitHub Pages, sem
nenhuma configuração de build (é site estático puro).

## Conteúdo a revisar antes de publicar

- Links "View project →" dos três cards em Featured Projects ainda apontam para `#`
  (não há projeto vinculado ainda).
- Confirmar se os links do Fiverr, itch.io, GitHub e o usuário do Discord estão corretos.
