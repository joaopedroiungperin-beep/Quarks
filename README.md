# Clube de Ciências Quarks — site institucional (v2 · "Do quark ao cristal")

Site 100% estático para GitHub Pages: HTML + CSS autoral com design tokens + ES Modules nativos. Não há etapa de build.

## Testar localmente

Os módulos ES e os arquivos `data/*.json` precisam de um servidor HTTP, então abrir o `index.html` direto do disco (`file://`) não funciona. Na raiz do repositório:

```bash
python3 -m http.server 8000
```

Depois acesse http://localhost:8000.

## Estrutura

```
index.html                  Home (todas as seções)
css/main.css                Tokens, base e componentes
css/project.css             Estilos dos capítulos de projeto
js/main.js                  Entrada da home
js/core.js                  Lenis + GSAP, revelações, navegação, painel lateral, utilidades
js/preloader.js             Oscilador harmônico amortecido → marca Quarks
js/cosmos.js                Fundo WebGL narrativo: o ciclo de vida estelar guiado pela rolagem (ver abaixo)
js/sections.js              Vitrine de atuação, método, portfólio, time, transparência
js/lattice.js               Parceiros como rede cristalina (Canvas 2D)
js/forms.js · js/config.js  Formulários (Web3Forms + WhatsApp)
js/project.js               Template dos capítulos de projeto
data/*.json                 Todo o conteúdo editável
projetos/<slug>/            Um capítulo por projeto (index.html + scene.js)
vendor/                     three 0.160.0, gsap 3.12.5 (+ScrollTrigger), lenis 1.1.13
assets/                     Imagens WebP/AVIF, capas de PDF, marca em SVG
documents/ assembleias/     PDFs oficiais
```

## Idiomas

O português é o original, escrito no HTML e em `data/*.json`. O site escolhe o idioma pelo **idioma do navegador/sistema** do visitante (não pelo país), e o seletor no menu guarda a escolha manual.

| Idioma | Como é traduzido |
|---|---|
| Português | original |
| Inglês, espanhol, chinês (simplificado) | tradução revisada em `i18n/en.json`, `i18n/es.json`, `i18n/zh.json` |
| Qualquer outro | tradução automática do Google, carregada só para quem precisa (com aviso no seletor) |

As traduções são indexadas por um hash do texto em português (`js/i18n.js`). **Ao mudar ou criar um texto, ele aparece em português nos três idiomas revisados até ganhar tradução**, nunca vazio. Para traduzir:

1. Abra o site em português, role até o fim e rode `__i18nDump()` no console: ele lista `{ hash: "texto" }` de tudo que é traduzível.
2. Adicione `"hash": "tradução"` em cada `i18n/<idioma>.json`, mantendo as mesmas tags HTML do original.

Textos escritos por JavaScript passam por `t('texto')` (ou `t('{n} blocos', { n })`). Eles não aparecem no `__i18nDump()`: o hash de cada um sai de `__i18nHash('texto')` no console.

## Editar conteúdo

| O quê | Onde |
|---|---|
| Frentes de atuação (cards da vitrine) | `data/services.json` |
| Projetos do portfólio | `data/projects.json` |
| Parceiros | `data/partners.json` |
| Time | `data/team.json` |
| Obras e ISBNs | `data/publications.json` (`items`: série do projeto, exibida na estante; `others`: demais publicações) |
| Documentos de transparência | `data/documents.json` (`"status": "em-publicacao"` mostra a tag e não cria link; `note` aparece no painel) |
| Funções no DITeQ (NIT) | campo `diteq` em `data/team.json` |
| Estudos citados | `data/studies.json` |

Para incluir um novo parceiro, adicione um objeto em `partners.json` com o logo em `assets/img/parceiros/`. Ele aparece automaticamente na rede cristalina e na lista.

## Novo projeto (capítulo)

1. Adicione o projeto em `data/projects.json`, com um `slug` novo.
2. Copie `projetos/energia-sustentavel/` para `projetos/<slug>/` e troque `data-project="<slug>"` no `index.html`.
3. Escreva a cena exclusiva em `projetos/<slug>/scene.js`. O contrato é:
   ```js
   export function mount(container, { THREE }) {
     return { update(progress) {}, resize() {}, destroy() {} };
   }
   ```
   `progress` vai de 0 a 1 enquanto a seção do palco está fixada na tela.

## Formulários

Crie uma chave gratuita em [web3forms.com](https://web3forms.com) com o e-mail que deve receber as mensagens e cole-a em `js/config.js` (`WEB3FORMS_KEY`). Enquanto a chave estiver vazia, o envio abre o WhatsApp com a mensagem já preenchida.

## Fundo narrativo (js/cosmos.js)

A rolagem é o "tempo cósmico". Cada seção declara sua fase em `data-phase`, e o fundo interpola entre fases vizinhas:

| Fase | Momento | Seção na home |
|---|---|---|
| 0 | Nebulosa | Início |
| 1 | Colapso gravitacional | Contexto (IDEB) |
| 2 | Ignição | Método |
| 3 | Supernova | Proposta |
| 4 | Magnetar | Atuação |
| 5 | Buraco negro + radiação Hawking | Portfólio |
| 6 | Evaporação e rasgo (bolha de novo vácuo) | Parceiros |
| 7 | Universo estranho: gravidade intensa, raios, mar de polaritons; o cursor cria um vórtice quântico | Sobre |
| 8 | Rasgo tridimensional: tempo dilatado, eletricidade estática, forças forte/fraca/eletromagnética se aproximando | DITeQ, Transparência |
| 9 | Grande Colapso (Big Crunch) | Participe / Contato |
| 10 | Singularidade → Big Bang (dispara ao chegar ao fim da página) | Rodapé |

Ao clicar num link com `data-wormhole`, a partícula virtual seguida entra num buraco de minhoca. Na página do projeto (`createCosmos(..., { mode: 'wormhole' })`) a travessia acompanha a rolagem e a saída, no universo estranho, acontece no fim da página. Use só fases adjacentes entre seções vizinhas: um salto de 0 para 7 atravessaria todas as fases intermediárias.

O fundo mede o próprio fps e, se ele ficar baixo, reduz resolução e detalhe sozinho. No console, `__cosmos.debug()` mostra a fase atual e o nível de qualidade, e `__cosmos.force(6.4)` fixa uma fase para inspeção (`force(null)` volta à rolagem).

## Acessibilidade e desempenho

- Com `prefers-reduced-motion` ativo, as animações de scroll ficam desligadas e o fundo vira um quadro estático por fase (sem túnel de minhoca).
- Sem JavaScript, todo o conteúdo estático continua legível.
- O DPR é limitado a 1,5, o render pausa com a aba oculta e o número de partículas cai no celular.
- Os embeds do Instagram só carregam quando o visitante clica no vídeo.
