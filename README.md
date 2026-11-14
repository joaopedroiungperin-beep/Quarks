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
js/field.js                 Fundo WebGL (Three.js): trios de quarks que mudam de formação com a rolagem
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

## Editar conteúdo

| O quê | Onde |
|---|---|
| Frentes de atuação (cards da vitrine) | `data/services.json` |
| Projetos do portfólio | `data/projects.json` |
| Parceiros | `data/partners.json` |
| Time | `data/team.json` |
| Obras e ISBNs | `data/publications.json` (preencha o campo `isbn` de cada volume) |
| Documentos de transparência | `data/documents.json` (`"status": "em-publicacao"` mostra a tag e não cria link) |
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

## Acessibilidade e desempenho

- Com `prefers-reduced-motion` ativo, o fundo WebGL e as animações de scroll ficam desligados.
- Sem JavaScript, todo o conteúdo estático continua legível.
- O DPR é limitado a 1,5, o render pausa com a aba oculta e o número de partículas cai no celular.
- Os embeds do Instagram só carregam quando o visitante clica no vídeo.
