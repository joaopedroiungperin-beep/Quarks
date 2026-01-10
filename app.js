// Função para alternar o menu lateral
function toggleMenu() {
    const menuIcon = document.getElementById("menu-icon");
    const sidenav = document.getElementById("sidenav");

    menuIcon.classList.toggle("change");
    menuIcon.classList.toggle("move");

    // Alterna a largura do sidenav
    sidenav.style.width = sidenav.style.width === "250px" ? "0" : "250px";
}

// Fecha o sidenav ao redimensionar a janela
function closeSidenavOnResize() {
    const menuIcon = document.getElementById("menu-icon");
    const sidenav = document.getElementById("sidenav");

    if (window.innerWidth > 1024 && sidenav.style.width === "250px") {
        sidenav.style.width = "0";
        menuIcon.classList.remove("change", "move"); // Fecha a sidenav
    }
}

// Adiciona um listener para o redimensionamento da janela
window.addEventListener('resize', closeSidenavOnResize);

document.addEventListener("DOMContentLoaded", function() {
    const thumbnail = document.querySelector('.thumbnail');

    // Função para recalcular e aplicar a largura
    function updateThumbnailWidth() {
        thumbnail.style.width = 'max-content';
        thumbnail.style.width = window.getComputedStyle(thumbnail).width;
    }

    // Observa mudanças no tamanho do elemento
    const resizeObserver = new ResizeObserver(() => {
        updateThumbnailWidth();
    });
    resizeObserver.observe(thumbnail);

    // Recalcula a largura quando a janela é redimensionada
    window.addEventListener('resize', updateThumbnailWidth);

    // Calcula a largura inicialmente
    updateThumbnailWidth();
});

// Obtenção dos elementos do DOM
const nextDom = document.getElementById('next');
const prevDom = document.getElementById('prev');
const carouselDom = document.querySelector('.carousel');
const thumbnailBorderDom = carouselDom.querySelector('.thumbnail');
const sliderDom = carouselDom.querySelector('.list');
const thumbnailItemsDom = thumbnailBorderDom.querySelectorAll('.item');
const timeBar = document.querySelector('.carousel .time'); // Barra de ggresso
const timeBarReverse = document.querySelector('.time-reverse'); // Nova barra

// Configuração dos tempos de animação
const timeAutoNext = 7000; // Tempo até a próxima troca automática

// Estado de animação
let isAnimating = false;

// Função para avançar para o próximo slide
nextDom.onclick = () => showSlider('next');

// Função para voltar ao slide anterior
prevDom.onclick = () => showSlider('prev');

// Inicia a navegação automática
let runNextAuto = setTimeout(autoNext, timeAutoNext);

// Função para mostrar o próximo ou anterior slide
function showSlider(type, speed = 500) {
    if (isAnimating) return; // Impede a ação enquanto a animação está ocorrendo
    isAnimating = true;

    const sliderItemsDom = sliderDom.querySelectorAll('.item');
    const thumbnailItemsDom = document.querySelectorAll('.thumbnail .item');

    if (type === 'next') {
        // Adiciona o primeiro item ao final para avançar
        sliderDom.appendChild(sliderItemsDom[0]);
        thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);
        carouselDom.classList.add('next');
    } else {
        // Adiciona o último item ao início para retroceder
        sliderDom.prepend(sliderItemsDom[sliderItemsDom.length - 1]);
        thumbnailBorderDom.prepend(thumbnailItemsDom[thumbnailItemsDom.length - 1]);
        carouselDom.classList.add('prev');
    }

    // Remove as classes de animação após o tempo definido
    setTimeout(() => {
        carouselDom.classList.remove('next', 'prev');
        isAnimating = false; // Libera para a próxima interação
    }, speed); // Tempo de animação reduzido para resposta rápida

    // Reinicia o timer da navegação automática
    clearTimeout(runNextAuto);
    runNextAuto = setTimeout(autoNext, timeAutoNext);

    // Reinicia a barra de progresso
    resetTimeBar();
}

// Função para navegação automática
function autoNext() {
    showSlider('next'); // Simula o clique no botão "próximo"
}

// Função para reiniciar a animação da barra de progresso 
function resetTimeBar() {
    // (cresce da esquerda para a direita)
    timeBar.style.transition = 'none';  // Remove a transição temporariamente
    timeBar.style.width = '0%';  // Reinicia a barra para 0
    timeBar.offsetHeight; // Força a reflow
    timeBar.style.transition = `width ${timeAutoNext / 1000}s linear`;  // Define o tempo da transição para 7s
    timeBar.style.width = '100%';  // Inicia a animação

    // (cresce da direita para a esquerda)
    timeBarReverse.style.transition = 'none'; // Remove a transição temporariamente
    timeBarReverse.style.width = '0%'; // Reinicia a barra para 0
    timeBarReverse.offsetHeight; // Força reflow
    timeBarReverse.style.transition = `width ${timeAutoNext / 1000}s linear`; // Define a transição
    timeBarReverse.style.width = '100%'; // Inicia a animação
}

// Inicializa o carrossel com o primeiro thumbnail
function init() {
    thumbnailBorderDom.appendChild(thumbnailItemsDom[0]);
    resetTimeBar();  // Inicia a barra de progresso ao carregar a página
}

// Função para adicionar ouvintes de clique às miniaturas 
function addThumbnailClickListeners() {
    const thumbnailItemsArray = Array.from(thumbnailItemsDom);
    thumbnailItemsArray.forEach((item) => {
        item.onclick = () => {
            const updatedThumbnailItems = Array.from(thumbnailBorderDom.querySelectorAll('.item'));
            const currentIndex = updatedThumbnailItems.indexOf(item); // Captura a posição dinâmica do item clicado
            
            // Calcula quantos cliques no botão "próximo" são necessários
            const clicksNeeded = currentIndex; // +1 porque queremos mover para a posição 0

            // Função recursiva para simular os cliques
            function simulateClicks(clicksLeft) {
                if (clicksLeft > 0 && !isAnimating) { // Verifica se ainda há cliques a simular e se não está animando
                    showSlider('next', 1); // Simula o clique no botão "próximo"
                    setTimeout(() => simulateClicks(clicksLeft - 1), 1); // Chama novamente após o tempo de animação
                } else {
                    // Quando termina, volta ao tempo normal
                    setTimeout(() => showSlider('next', 500), 0); 
                }
            }

            // Inicia a simulação de cliques
            simulateClicks(clicksNeeded);
        };
    });
}

// Função para detectar swipe no touch
function addTouchListeners() {
    let startX = 0;
    let endX = 0;

    // Detecta o início do toque
    carouselDom.addEventListener('touchstart', (event) => {
        startX = event.touches[0].clientX; // Captura a posição inicial do toque
    });

    // Detecta o movimento durante o toque
    carouselDom.addEventListener('touchmove', (event) => {
        endX = event.touches[0].clientX; // Captura a posição final do toque
    });

    // Detecta o fim do toque e determina a direção do swipe
    carouselDom.addEventListener('touchend', () => {
        const distance = startX - endX;

        // Se a distância for suficiente, detecta a direção
        if (Math.abs(distance) > 50) { // Define o mínimo para ser considerado swipe
            if (distance > 0) {
                // Swipe da direita para a esquerda (next)
                showSlider('next');
            } else {
                // Swipe da esquerda para a direita (prev)
                showSlider('prev');
            }
        }
    });
}

// Adiciona os ouvintes de toque somente em telas menores que 920px
if (window.innerWidth <= 920) {
    addTouchListeners();
}

// Chama a função para adicionar ouvintes de clique às miniaturas
addThumbnailClickListeners();

// Chama a função de inicialização
init();

// Variável de controle para saber quando a animação da logo foi concluída
let logoAnimada = false;

//LOGO
document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('logoAnimated');
    const logoEstatica = document.getElementById('logoEstatica');
    const letras = document.getElementById('allLetras');
    const letrasContainer = document.getElementById('letrasContainer');
    const letraC = document.getElementById('letraC');
    const letraP = document.getElementById('letraP');
    const letraD = document.getElementById('letraD');
    const letrasContainer2 = document.getElementById('letrasContainer2');
    const letraI = document.getElementById('letraI');
    const letraE = document.getElementById('letraE');
    const letraN = document.getElementById('letraN');
    const letraC2 = document.getElementById('letraC2');
    const letraI2 = document.getElementById('letraI2');
    const letraA = document.getElementById('letraA');
    const letrasContainer3 = document.getElementById('letrasContainer3');
    const letraO = document.getElementById('letraO');
    const letraR = document.getElementById('letraR');
    const letrasContainer4 = document.getElementById('letrasContainer4');
    const letraI3 = document.getElementById('letraI3');    

    video.addEventListener('timeupdate', function() {
        const timeRemaining = video.duration - video.currentTime;
        if (timeRemaining <= 0.300) {
            video.style.display = 'none';
            logoEstatica.style.display = 'block';

            setTimeout(function() {
                // Movendo a logo
                logoEstatica.classList.add('logo-posicionada');
                letras.classList.add('letras-posicionadas');
                // Mostrar as letras saindo de trás da logo
                letrasContainer.classList.add('showLetters');
                 // Mostrar as letras saindo de trás da logo
                letrasContainer2.classList.add('showLetters2');
                // Mostrar as letras saindo de trás da logo
                letrasContainer3.classList.add('showLetters3');
                // Mostrar as letras saindo de trás da logo
                letrasContainer4.classList.add('showLetters4');
                // Movimentar as letras
                setTimeout(function() {
                    letraP.classList.add('moveDown');
                    letraD.classList.add('moveDown');
                    letraI.classList.add('moveRight');
                    letraE.classList.add('moveRight');
                    letraN.classList.add('moveRight');
                    letraC2.classList.add('moveRight');
                    letraI2.classList.add('moveRight');
                    letraA.classList.add('moveRight');
                    letraO.classList.add('moveRightDown');
                    letraR.classList.add('moveRightDown');
                    letraI3.classList.add('moveLeftDown');
                    letraV.classList.add('moveLeftDown');
                    letraE2.classList.add('moveLeftDown');
                    letraR2.classList.add('moveLeftDown');
                    letraS.classList.add('moveLeftDown');
                    letraA2.classList.add('moveLeftDown');
                    letraO2.classList.add('moveLeftDown');
                }, 100);  // Ajuste o tempo para sincronizar com o movimento da logo

                 // Marca a animação como concluída
                logoAnimada = true;
                
                 // Força a execução do efeito de rolagem se a animação já acabou
                triggerScrollEffect();

            }, 100);
        }
    });
});

// Evento de scroll, que só será ativado após a animação da logo
const header = document.querySelector("header");
const menuIcon = document.querySelector(".menu-icon");

// Função que aplica o efeito de scroll
function triggerScrollEffect() {
  if (window.scrollY > 0) {
    header.classList.add("shrink");
    menuIcon.classList.add("menu-up");
  } else {
    header.classList.remove("shrink");
    menuIcon.classList.remove("menu-up");
  }
}

// Monitoramento do scroll, com controle da animação
window.addEventListener("scroll", () => {
  if (logoAnimada) { // Verifica se a animação foi concluída
    triggerScrollEffect();
  }
});


//Estudos Nacionais
const SciDoc0 = document.getElementById('SciDoc0');
const estudos0 = [
    { autores: "Perkins & Salomon", ano: "1992", link: "https://www.scirp.org/reference/referencespapers?referenceid=3014151" },
    { autores: "Slavin", ano: "1995", link: "https://www.sciencedirect.com/science/article/pii/089543569400097A" },
    { autores: "Hake", ano: "1998", link: "https://www.scirp.org/reference/referencespapers?referenceid=1542019" },
    { autores: "Bransford et al.", ano: "2000", link: "https://nap.nationalacademies.org/read/10067/chapter/7" },
    { autores: "Jonassen", ano: "2000", link: "https://www.scirp.org/reference/referencespapers?referenceid=2894252" },
    { autores: "Deci & Ryan", ano: "2000", link: "https://psycnet.apa.org/record/2001-03012-001" },
    { autores: "Barnett & Ceci", ano: "2002", link: "https://pubmed.ncbi.nlm.nih.gov/12081085/" },
    { autores: "Prince", ano: "2004", link: "https://www.scirp.org/reference/referencespapers?referenceid=1505162" },
    { autores: "Mayer & Wittrock", ano: "2006", link: "https://www.scirp.org/reference/referencespapers?referenceid=1062571" },
];

estudos0.forEach(estudo0 => {
    const item0 = document.createElement('div');
    item0.classList.add('SciDoc-item0');
    item0.innerHTML = `${estudo0.autores} (${estudo0.ano})`;
    item0.addEventListener('click', () => {
        window.open(estudo0.link, '_blank');
    });
    SciDoc0.appendChild(item0);
});

let scrollAmountSci0 = 0;
let scrollSpeedSci0 = 1;
let isPausedSci0 = false;
const SciDocContainer0 = document.querySelector('.SciDoc-container0');

function scrollSciDoc0() {
    if (!isPausedSci0) {
        SciDocContainer0.scrollLeft += scrollSpeedSci0;
        if (SciDocContainer0.scrollLeft + SciDocContainer0.clientWidth >= SciDocContainer0.scrollWidth) {
            SciDocContainer0.scrollLeft = 0;
        }
    }
    requestAnimationFrame(scrollSciDoc0);
}

SciDocContainer0.addEventListener('mouseenter', () => isPausedSci0 = true);
SciDocContainer0.addEventListener('mouseleave', () => isPausedSci0 = false);

scrollSciDoc0();

//Estudos internacionais
const SciDoc = document.getElementById('SciDoc');
const estudos = [
    { autores: "Johnson et al.", ano: "1990", link: "https://www.scirp.org/reference/referencespapers?referenceid=2177221" },
    { autores: "Bonwell & Eison", ano: "1991", link: "https://eric.ed.gov/?id=ED336049" },
    { autores: "Perkins & Salomon", ano: "1992", link: "https://www.scirp.org/reference/referencespapers?referenceid=3014151" },
    { autores: "Slavin", ano: "1995", link: "https://www.sciencedirect.com/science/article/pii/089543569400097A" },
    { autores: "Hake", ano: "1998", link: "https://www.scirp.org/reference/referencespapers?referenceid=1542019" },
    { autores: "Bransford et al.", ano: "2000", link: "https://nap.nationalacademies.org/read/10067/chapter/7" },
    { autores: "Jonassen", ano: "2000", link: "https://www.scirp.org/reference/referencespapers?referenceid=2894252" },
    { autores: "Deci & Ryan", ano: "2000", link: "https://psycnet.apa.org/record/2001-03012-001" },
    { autores: "Barnett & Ceci", ano: "2002", link: "https://pubmed.ncbi.nlm.nih.gov/12081085/" },
    { autores: "Prince", ano: "2004", link: "https://www.scirp.org/reference/referencespapers?referenceid=1505162" },
    { autores: "Mayer & Wittrock", ano: "2006", link: "https://www.scirp.org/reference/referencespapers?referenceid=1062571" },
    { autores: "Hattie", ano: "2008", link: "https://link.springer.com/article/10.1007/s11159-011-9198-8" },
    { autores: "National Research Council", ano: "2012", link: "https://www.scirp.org/reference/referencespapers?referenceid=1302130" },
    { autores: "Dunlosky et al.", ano: "2013", link: "https://pubmed.ncbi.nlm.nih.gov/26173288/" },
    { autores: "Mayer", ano: "2014", link: "https://psycnet.apa.org/record/2015-00153-000" },
    { autores: "Freeman et al.", ano: "2014", link: "https://www.pnas.org/doi/10.1073/pnas.1319030111" },
    { autores: "Schacter", ano: "2021", link: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8285452/" },
];

estudos.forEach(estudo => {
    const item = document.createElement('div');
    item.classList.add('SciDoc-item');
    item.innerHTML = `${estudo.autores} (${estudo.ano})`;
    item.addEventListener('click', () => {
        window.open(estudo.link, '_blank');
    });
    SciDoc.appendChild(item);
});

let scrollAmountSci = 0;
let scrollSpeedSci = 1;
let isPausedSci = false;
const SciDocContainer = document.querySelector('.SciDoc-container');

function scrollSciDoc() {
    if (!isPausedSci) {
        SciDocContainer.scrollLeft += scrollSpeedSci;
        if (SciDocContainer.scrollLeft + SciDocContainer.clientWidth >= SciDocContainer.scrollWidth) {
            SciDocContainer.scrollLeft = 0;
        }
    }
    requestAnimationFrame(scrollSciDoc);
}

SciDocContainer.addEventListener('mouseenter', () => isPausedSci = true);
SciDocContainer.addEventListener('mouseleave', () => isPausedSci = false);

scrollSciDoc();

// PORTFÓLIO
const imageament = document.getElementById("project-imgPort");
const mediaQuery600 = window.matchMedia("(max-width: 600px)");
const mediaQuery800 = window.matchMedia("(max-width: 800px)");

function verificarMediaQuery() {
    if (mediaQuery600.matches) return 0.5;
    if (mediaQuery800.matches) return 0.75;
    return 1;
}

let i;
// Escuta mudanças na largura da tela
[mediaQuery600, mediaQuery800].forEach(mediaQuery => {
    mediaQuery.addEventListener("change", () => {
        i = verificarMediaQuery(); // Atualiza a variável i corretamente

        // 1. Encontra o checkpoint do projeto que está ativo (o que foi clicado)
        const checkpointAtivo = document.querySelector('.checkpointP.ativo');

        // 2. Se um projeto estiver ativo, significa que as imagens estão com "iline"
        if (checkpointAtivo) {
            // Pega o ícone do projeto ativo (o que foi encolhido)
            const imagemIconeAtivo = checkpointAtivo.querySelector('.dotP img');
            if (imagemIconeAtivo) {
                // Atualiza seu estilo inline com o novo tamanho responsivo
                imagemIconeAtivo.style.width = `${50 * i}px`;
            }

            // Atualiza o estilo inline da imagem principal (imageament)
            imageament.style.width = `${200 * i}px`;
        }

        //    ícones que não estão ativos, caso eles também tenham recebido algum estilo inline em algum momento.
        document.querySelectorAll('.checkpointP:not(.ativo) .dotP img').forEach(img => {
            img.style.width = `${150 * i}px`;
        });
    });
});

// AÇÃO (Executada a cada clique)
document.querySelectorAll(".dotP").forEach(dot => {
    dot.addEventListener("click", function() {
        const checkpoint = this.closest(".checkpointP");
        const image = checkpoint.querySelector(".dotP img");

        // Consulta a função que já existe para pegar o valor atual de 'i'
        i = verificarMediaQuery();

        if (checkpoint.id === "introP") {
            // AÇÃO 1: O USUÁRIO CLICOU NO LOGO DE INTRODUÇÃO (Resetar tudo)

            // Procura se há algum projeto ativo.
            const checkpointAtivo = document.querySelector('.checkpointP.ativo');
            if (checkpointAtivo) {
                // Se houver, remove a "bandeira" dele...
                checkpointAtivo.classList.remove('ativo');
                // ...e restaura seu tamanho.
                const imagemAtiva = checkpointAtivo.querySelector('.dotP img');
                imagemAtiva.style.width = `${150 * i}px`;
            }

            // Reseta para o estado inicial.
            imageament.style.width = `${50 * i}px`;
            document.querySelector(".timelineP").style.setProperty("--j", "25%");

            // Executa sua animação de pulso original para o logo.
            setTimeout(() => {
                image.classList.add("animateImage");
            }, 100);
            setTimeout(() => {
                image.classList.remove("animateImage");
            }, 700);

        } else {
            // AÇÃO 2: O USUÁRIO CLICOU EM UM CHECKPOINT DE PROJETO

            // Primeiro, verificamos se o projeto clicado já era o ativo.
            if (checkpoint.classList.contains('ativo')) {
                // CASO 2.1: CLICOU EM UM PROJETO QUE JÁ ESTAVA ATIVO.
                // Objetivo: Executar a animação de "pulso", mantendo o estado.

                image.classList.add("animateImageInverse");
                imageament.classList.add("animateImageDiverse");
                document.querySelector(".timelineP").style.setProperty("--j", "25%");

                setTimeout(() => {
                    document.querySelector(".timelineP").style.setProperty("--j", "75%");
                }, 500);
                
                setTimeout(() => {
                    image.classList.remove("animateImageInverse");
                    imageament.classList.remove("animateImageDiverse");
                }, 1000);

            } else {
                // CASO 2.2: CLICOU EM UM PROJETO NOVO (QUE ESTAVA INATIVO).
                // Objetivo: Desativar o projeto antigo e ativar este novo.

                // Primeiro, procura e desativa o que estava ativo ANTES.
                const checkpointAtivoAnterior = document.querySelector('.checkpointP.ativo');
                if (checkpointAtivoAnterior) {
                    checkpointAtivoAnterior.classList.remove('ativo');
                    const imagemAntiga = checkpointAtivoAnterior.querySelector('.dotP img');
                    imagemAntiga.style.width = `${150 * i}px`;
                }

                // Agora, ativa o NOVO projeto que foi clicado.
                checkpoint.classList.add('ativo');
                
                // E executa a sua lógica para encolher a imagem e ajustar a UI.
                setTimeout(() => {
                    image.style.width = `${50 * i}px`;
                    imageament.style.width = `${200 * i}px`;
                    document.querySelector(".timelineP").style.setProperty("--j", "75%");
                }, 550);
            }
        }

        const infoBox = document.querySelector('.info-boxPort');

        // Aplica a primeira animação (reduzir a altura)
        infoBox.classList.add('box-animation-out');

        // Aguarda o término da primeira animação antes de trocar os dados
        setTimeout(() => {
            // Atualizando as informações do projeto
            document.getElementById("project-imgPort").src = checkpoint.dataset.box;
            document.getElementById("project-titlePort").innerText = checkpoint.dataset.title;
            document.getElementById("project-subTitlePort").innerText = checkpoint.dataset.subtitle;
            document.getElementById("project-port").src = checkpoint.dataset.part;
            document.getElementById("project-descPort").innerText = checkpoint.dataset.desc;
            document.getElementById("transpRel").href = checkpoint.dataset.rel;
            document.getElementById("transpBal").href = checkpoint.dataset.bal;

            // Controle de exibição
            if (checkpoint.id === "introP") {
                // Esconder elementos
                document.getElementById("project-imgPort").style.display = "none";
                document.getElementById("project-imgPort").style.opacity = "0";
                
                // Esconder todos os elementos das classes especificadas
                [".projectPartner", ".products", ".descriptPjt", ".demoTransp", ".registerProject"].forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.display = "none";
                        el.style.opacity = "0";
                    });
                });
                
                // Mostrar subtítulo
                document.getElementById("project-subTitlePort").style.display = "block";
                document.getElementById("project-subTitlePort").style.opacity = "1";
                
            } else {
                // Mostrar elementos
                document.getElementById("project-imgPort").style.display = "flex";
                document.getElementById("project-imgPort").style.opacity = "1";
                
                // Mostrar todos os elementos das classes especificadas
                [".projectPartner", ".products", ".descriptPjt", ".demoTransp", ".registerProject"].forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.display = "flex";
                        el.style.opacity = "1";
                    });
                });
                
                // Esconder subtítulo
                document.getElementById("project-subTitlePort").style.display = "none";
                document.getElementById("project-subTitlePort").style.opacity = "0";
            }
            // Remove a classe da animação de saída
            infoBox.classList.remove('box-animation-out');

            // Aplica a animação de entrada para restaurar a altura
            infoBox.classList.add('box-animation-in');

            // Remove a classe de entrada após a animação terminar para permitir futuras trocas
            setTimeout(() => {
                infoBox.classList.remove('box-animation-in');
            }, 400); // Mesmo tempo da animação de entrada
        }, 400); // Mesmo tempo da animação de saída
                
        // Obtém o array de PDFs do dataset
        const products = JSON.parse(checkpoint.dataset.products);  // Converte a string JSON para array
        const container = document.querySelector(".documents-inner1");  // Onde os canvas serão adicionados

        container.innerHTML = "";  // Limpa o container antes de adicionar os novos canvases

        // Para cada produto (PDF), cria um canvas e carrega o PDF correspondente
        products.forEach(pdfFile => {
            const canvas = document.createElement("canvas");  // Cria um novo elemento canvas
            canvas.classList.add("pdf-canvas");  // Adiciona uma classe CSS para o canvas (opcional)
            container.appendChild(canvas);  // Adiciona o canvas ao container

            // Define o URL do PDF
            const pdfUrl = `http://localhost/Quarks/documents/didatic/${pdfFile}`;

            // Configuração do PDF.js
            const pdfjsLib = window.pdfjsLib;
            pdfjsLib.getDocument(pdfUrl).promise.then(pdf => {
                return pdf.getPage(1);  // Obtém a primeira página do PDF
            }).then(page => {
                const targetWidth = 175;  // Define a largura desejada para o canvas
                const scale = targetWidth / page.getViewport({ scale: 1 }).width;  // Ajusta a escala baseada na largura

                const viewport = page.getViewport({ scale });  // Aplica a escala para manter as proporções

                // Ajusta o tamanho do canvas com a nova largura e altura
                canvas.width = targetWidth;
                canvas.height = viewport.height;  // Ajusta a altura proporcionalmente

                const context = canvas.getContext("2d");

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };

                // Renderiza a página do PDF no canvas
                return page.render(renderContext);
            })
        });
    });
});

const gallery = document.getElementById('gallery');
const images = [];
for (let i = 1; i <= 100; i++) {
    images.push(`<img src="https://picsum.photos/100?random=${i}" alt="Arquivo ${i}">`);
}
gallery.innerHTML = images.join('');

let scrollAmount = 0;
let scrollSpeed = 1;
let isPaused = false;
let isPopupOpenG = false;
const galleryContainer = document.querySelector('.gallery-container');

function scrollGallery() {
    if (!isPaused && !isPopupOpenG) {
        galleryContainer.scrollLeft += scrollSpeed;
        if (galleryContainer.scrollLeft + galleryContainer.clientWidth >= galleryContainer.scrollWidth) {
            galleryContainer.scrollLeft = 0;
        }
    }
    requestAnimationFrame(scrollGallery);
}

galleryContainer.addEventListener('mouseenter', () => isPaused = true);
galleryContainer.addEventListener('mouseleave', () => isPaused = false);

// Popup Logic
const popup = document.getElementById('popupGallery');
const popupImg = document.getElementById('popupGallery-img');
const closeBtnG = document.getElementById('closeGallery');
const prevBtn = document.getElementById('prevGallery');
const nextBtn = document.getElementById('nextGallery');
let currentIndex = 0;
const galleryItems = Array.from(gallery.children);

function showPopup(index) {
    isPopupOpenG = true;
    popup.style.display = 'flex';
    popupImg.src = galleryItems[index].src;
    galleryItems.forEach(img => img.classList.remove('selectedGallery'));
    galleryItems[index].classList.add('selectedGallery');
    currentIndex = index;

    // Centralizar imagem usando scrollLeft
    const image = galleryItems[index];
    const containerWidth = galleryContainer.offsetWidth;
    const imageLeft = image.offsetLeft;
    const imageWidth = image.offsetWidth;
    let targetScroll = imageLeft - (containerWidth - imageWidth) / 2;
    
    targetScroll = Math.max(0, Math.min(targetScroll, gallery.scrollWidth - containerWidth));
    galleryContainer.scrollLeft = targetScroll;
}

galleryItems.forEach((item, index) => {
    item.addEventListener('click', () => showPopup(index));
});

function navigatePopup(direction) {
    currentIndex = (currentIndex + direction + galleryItems.length) % galleryItems.length;
    showPopup(currentIndex);
}

prevBtn.addEventListener('click', () => navigatePopup(-1));
nextBtn.addEventListener('click', () => navigatePopup(1));

closeBtnG.addEventListener('click', () => {
    popup.style.display = 'none';
    galleryItems.forEach(img => img.classList.remove('selectedGallery'));
    isPopupOpenG = false;
    gallery.style.transform = 'none'; // Adicione esta linha
});

popup.addEventListener('click', (e) => {
    if (e.target === popup) {
        popup.style.display = 'none';
        galleryItems.forEach(img => img.classList.remove('selectedGallery'));
        isPopupOpenG = false;
    }
});

scrollGallery();

// Parceiros
// Seleciona os elementos relevantes
const textP1 = document.querySelector('.textPartH1');
const textP3 = document.querySelector('.textPartH3');
const noMaskElement = document.querySelector('.noMaskConcese');
const maskElement = document.querySelector('.maskConcese');
const imgElement = document.querySelector('#imgPatternCCE image');
const popupP = document.querySelector('.popupPartner');
const closeBtn = document.querySelector('.close-btnPartner');
const svgElement = document.querySelector('.favo');

// Define as transições iniciais
maskElement.style.transition = 'fill 0.3s ease'; // Suavização de cor
imgElement.style.transition = 'transform 0.3s ease, translate 0.3s ease'; // Suavização de redimensionamento e posição

// Adiciona o evento de mouseover ao elemento .noMask
noMaskElement.addEventListener('mouseover', () => {
    maskElement.style.fill = '#ffff72cc'; // Cor ao passar o mouse

    // Aumenta a imagem com transform e ajusta a posição
    imgElement.style.transform = 'scale(1.05) translate(-6px, -5px)'; // Move para x = 47 (50 - 3)
});

// Adiciona o evento de mouseout para restaurar a cor e o tamanho originais
noMaskElement.addEventListener('mouseout', () => {
    maskElement.style.fill = '#ffff72'; // Cor original

    // Restaura o tamanho original e posição com transform
    imgElement.style.transform = 'scale(1) translate(0, 0)'; // Retorna para x = 50
});

// Variável para saber se a janela está aberta
let isPopupOpen = false;

/// Função que calcula o 'transform' com base na largura da tela
function calculatePopupTransform(screenWidth) {
    if (screenWidth <= 940) {
        return 'translate(-20%,-320%)';
    } else if (screenWidth > 940 && screenWidth < 1220) {
        return 'translate(390%, 0)';
    } else if (screenWidth >= 1220 && screenWidth < 1500) {
        const translateY = ((screenWidth - 1220) * 0.154) + 40;
        return `translate(380%, ${translateY}%)`;
    } else if (screenWidth >= 1500 && screenWidth < 1700) {
        return 'translate(380%, 0)';
    } else if (screenWidth >= 1700) {
        const translateY = (screenWidth - 1500) * 0.15;
        return `translate(380%, ${translateY}%)`;
    }
    return ''; // Valor padrão se necessário
}

// Função que atualiza o 'transform' do popup
function adjustPopupPosition() {
    const computedTransform = window.getComputedStyle(popupP).transform;

    // Se já estiver em 'translate(0, 0)', não faz nada
    if (computedTransform === 'matrix(1, 0, 0, 1, 0, 0)') return;

    // Atualiza o estilo com o valor calculado
    popupP.style.transform = calculatePopupTransform(window.innerWidth);
}

// Configura o evento de redimensionamento e chama o ajuste inicial
document.addEventListener('DOMContentLoaded', () => {
    adjustPopupPosition(); // Ajusta ao carregar
    window.addEventListener('resize', adjustPopupPosition); // Ajusta ao redimensionar
});

// Função para alternar o popup
function togglePopup() {
    const isSmallScreen = window.matchMedia('(max-width: 940px)').matches;

    if (isSmallScreen) {
        // Comportamento específico para telas <= 940px
        svgElement.style.transition = 'max-width 1.5s ease, transform 0.1s ease';
        svgElement.style.maxWidth = isPopupOpen ? '45%' : '25%';

        if (!isPopupOpen) {
            popupP.style.maxHeight = '400px';

            svgElement.animate(
                [
                    { transform: 'translateY(20%)' },
                    { transform: 'translateY(28%)' },
                    { transform: 'translateY(15%)' },
                    { transform: 'translateY(-5%)' },
                    { transform: 'translateY(0)' }
                ],
                { duration: 1500, easing: 'ease', fill: 'forwards' }
            ); 
        } else {
            setTimeout(() => {
                popupP.style.maxHeight = '50px';
            }, 1150);

            svgElement.animate(
                [
                    { transform: 'translateY(0)' },
                    { transform: 'translateY(-5%)' },
                    { transform: 'translateY(5%)' },
                    { transform: 'translateY(28%)' },
                    { transform: 'translateY(20%)' }
                ],
                { duration: 1400, easing: 'ease', fill: 'forwards' }
            );
        }

        popupP.style.transition = 'max-height 0.5s ease, opacity 1.5s ease, scale 1.4s ease, transform 1.4s ease';
        popupP.style.transform = isPopupOpen ? 'translate(-20%,-360%)' : 'translate(0,0)';
    } else {
        // Comportamento para telas maiores
        svgElement.style.transition = 'max-width 1.4s ease, transform 0.2s ease';
        svgElement.style.maxWidth = isPopupOpen ? '45%' : '25%';

        if (!isPopupOpen) {
            svgElement.animate(
                [
                    { transform: 'translateX(-13%)' },
                    { transform: 'translateX(-85%)' },
                    { transform: 'translateX(-45%)' },
                    { transform: 'translateX(40%)' },
                    { transform: 'translateX(0)' }
                ],
                { duration: 1200, easing: 'ease', fill: 'forwards' }
            );
        } else {
            svgElement.animate(
                [
                    { transform: 'translateX(0%)' },
                    { transform: 'translateX(40%)' },
                    { transform: 'translateX(-45%)' },
                    { transform: 'translateX(-85%)' },
                    { transform: 'translateX(-13%)' }
                ],
                { duration: 1200, easing: 'ease', fill: 'forwards' }
            );
        }
        
        popupP.style.transition = 'opacity 1.5s ease, scale 1.4s ease, transform 1.4s ease';
        textP1.style.transition = 'opacity 1.6s ease, scale 1.8s ease';
        textP3.style.transition = 'opacity 1.9s ease, scale 2.0s ease, transform 2.0s ease';

        const screenWidth = window.innerWidth; // Obtem a largura da tela
        if (screenWidth > 940 && screenWidth < 1220) {
            popupP.style.transform = isPopupOpen ? 'translate(390%, 0)' : 'translate(0,0)';
        } else if (screenWidth >= 1220 && screenWidth < 1500) {
            const translateY = ((screenWidth - 1220) * 0.154) + 40;
            popupP.style.transform = isPopupOpen ? `translate(380%, ${translateY}%)` : 'translate(0,0)';
        } else if (screenWidth >= 1500 && screenWidth < 1700) {
            popupP.style.transform = isPopupOpen ? 'translate(380%, 0)'  : 'translate(0,0)';
        } else if (screenWidth >= 1700) {
            const translateY = (screenWidth - 1500) * 0.15;
            popupP.style.transform = isPopupOpen ? `translate(380%, ${translateY}%)` : 'translate(0,0)';
        }
    }

    popupP.style.opacity = isPopupOpen ? '0' : '1';
    popupP.style.scale = isPopupOpen ? '0.2' : '1';
    textP1.style.opacity = isPopupOpen ? '1' : '0';
    textP1.style.scale = isPopupOpen ? '1' : '0';
    textP3.style.transform = isPopupOpen ? 'translate(0, 0)' : 'translate(0,-1750%)';
    textP3.style.opacity = isPopupOpen ? '1' : '0';
    textP3.style.scale = isPopupOpen ? '1' : '0';

    // Aguardar o fim da animação de fechamento
    if (isPopupOpen) {
        popupP.addEventListener('transitionend', () => {
            if (!isPopupOpen) {
                // Resetando os estilos após o fechamento
                svgElement.style.transform = '';
            }
        });
    }

    isPopupOpen = !isPopupOpen; // Alterna o estado
}

// Evento de clique no polygon com imagem
noMaskElement.addEventListener('click', () => {
    togglePopup();
});

// Evento de fechar a janela
closeBtn.addEventListener('click', () => {
    togglePopup();
});


// Participe
const telefonePartInput  = $('#phonePart');
telefonePartInput.mask('(00) 0 0000-0000');

// Atualizar contagem de caracteres do texto
const messageInputPart = document.getElementById('messagePart');
const charCountPart = document.getElementById('charPart-count');

messageInputPart.addEventListener('input', () => {
    const length = messageInputPart.value.length;

    if (length >= 10000) {
        charCountPart.textContent = `Você atingiu o limite de Caracteres! ${length}/10000 caracteres`;
        charCountPart.style.color = '#84eaf5'; // Muda a cor para azul
    } else {
        charCountPart.textContent = `${length}/10000 caracteres`;
        charCountPart.style.color = '#FFFFEE'; // Restaura a cor padrão
    }
});

// Sobre o Quarks e o Time
const carrosselConteudo = document.querySelector('.carrossel-conteudo');
const setaEsquerda = document.querySelector('.seta-esquerda');
const setaDireita = document.querySelector('.seta-direita');

let indiceAtual = 0; // Controla qual item está visível
const totalItens = document.querySelectorAll('.carrossel-conteudo .team').length;

const atualizarCarrossel = () => {
  const larguraItem = carrosselConteudo.querySelector('.team').offsetWidth;
  carrosselConteudo.style.transform = `translateX(-${indiceAtual * larguraItem}px)`;
};

// Função para atualizar o número de itens visíveis com base na largura da tela
function calcularItensVisiveis() {
  if (window.innerWidth <= 768) {
    return 1;
  } else if (window.innerWidth <= 1024) {
    return 2;
  } else {
    return 3;
  }
}

// Ao clicar na seta esquerda, move o carrossel para a direita
setaEsquerda.addEventListener('click', () => {
  const itensVisiveis = calcularItensVisiveis();

  if (indiceAtual > 0) {
    indiceAtual--; // Decrementa o índice
  } else {
    indiceAtual = totalItens - itensVisiveis; // Volta para o último item
  }
  atualizarCarrossel();
});

// Ao clicar na seta direita, move o carrossel para a esquerda
setaDireita.addEventListener('click', () => {
  const itensVisiveis = calcularItensVisiveis();

  if (indiceAtual < totalItens - itensVisiveis) {
    indiceAtual++; // Incrementa o índice
  } else {
    indiceAtual = 0; // Volta para o primeiro item
  }
  atualizarCarrossel();
});

// Recalcula ao redimensionar a tela
window.addEventListener('resize', () => {
  atualizarCarrossel();
});


// Mostrar mensagem sobre WhatsApp ao digitar o número
const phoneInput = document.getElementById('phone');
const whatsappInfo = document.getElementById('whatsapp-info');

phoneInput.addEventListener('input', () => {
    if (phoneInput.value.trim() !== "") {
        whatsappInfo.classList.remove('hidden');
    } else {
        whatsappInfo.classList.add('hidden');
    }
});

const telefoneInput  = $('#phone');
telefoneInput.mask('(00) 0 0000-0000');

// Atualizar contagem de caracteres da mensagem
const messageInput = document.getElementById('message');
const charCount = document.getElementById('char-count');

messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;

    if (length >= 10000) {
        charCount.textContent = `Você atingiu o limite de Caracteres! ${length}/10000 caracteres`;
        charCount.style.color = '#FB4C37'; // Muda a cor para vermelho
    } else {
        charCount.textContent = `${length}/10000 caracteres`;
        charCount.style.color = '#FFFFEE'; // Restaura a cor padrão
    }
});


const fileInput = document.getElementById('attachments');
const previewContainer = document.getElementById('preview-container');
const fileLabel = document.querySelector('.file-label');

const MAX_FILES = 3;

fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);

    // Limita a seleção de arquivos
    if (previewContainer.children.length + files.length > MAX_FILES) {
        alert(`Você pode enviar no máximo ${MAX_FILES} arquivos.`);
        fileInput.value = ''; // Limpa o seletor
        return;
    }

    // Configuração do PDF.js
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Função para gerar a prévia do PDF
function renderPdfPreview(file, container) {
    const fileReader = new FileReader();

    fileReader.onload = function (e) {
        const pdfData = new Uint8Array(e.target.result);

        // Carrega o PDF
        pdfjsLib.getDocument(pdfData).promise.then((pdf) => {
            // Obtém a primeira página do PDF
            pdf.getPage(1).then((page) => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                const viewport = page.getViewport({ scale: 1 });

                canvas.width = 100; // Largura fixa
                canvas.height = 100; // Altura fixa

                // Renderiza a página no canvas
                page.render({
                    canvasContext: context,
                    viewport: page.getViewport({ scale: canvas.width / viewport.width }),
                }).promise.then(() => {
                    container.insertBefore(canvas, container.lastChild); // Adiciona antes do nome do arquivo
                });
            });
        }).catch((error) => {
            console.error('Erro ao carregar o PDF:', error);
        });
    };

    fileReader.readAsArrayBuffer(file);
}

// Adiciona prévia dos arquivos selecionados
files.forEach((file) => {
    const previewItem = document.createElement('div');
    previewItem.classList.add('preview-item');

    // Criar o "x" para excluir
    const removeBtn = document.createElement('div');
    removeBtn.classList.add('remove-file');
    removeBtn.textContent = '×';
    previewItem.appendChild(removeBtn);

    let visualElement;

    if (file.type.startsWith('image/')) {
        // Prévia para imagens
        visualElement = document.createElement('img');
        visualElement.src = URL.createObjectURL(file);
        visualElement.width = 100;
        visualElement.height = 100;
    } else if (file.type === 'application/pdf') {
        // Prévia para PDFs
        visualElement = document.createElement('div');
        renderPdfPreview(file, previewItem); // Adiciona o canvas dinamicamente
    }

    if (visualElement) {
        previewItem.appendChild(visualElement);
    }

    const fileName = document.createElement('p');
    fileName.textContent = file.name;
    previewItem.appendChild(fileName); // Nome do arquivo sempre é o último elemento

    previewContainer.appendChild(previewItem);

    // Adiciona o evento para excluir o arquivo
    removeBtn.addEventListener('click', () => {
        previewItem.remove();
        if (previewContainer.children.length < MAX_FILES) {
            fileLabel.style.display = 'inline-block';
        }
    });
});


    // Limita a adição de novos arquivos e oculta o seletor, se necessário
    if (previewContainer.children.length >= MAX_FILES) {
        fileLabel.style.display = 'none';
    }

    // Limpa o seletor para permitir novas seleções
    fileInput.value = '';
});

 document.addEventListener("DOMContentLoaded", () => {
            const categories = document.querySelectorAll(".documents");

            categories.forEach(category => {
                const maxVisible = parseInt(category.dataset.maxVisible, 10);
                const docs = category.querySelectorAll(".document");

                if (maxVisible && docs.length > maxVisible) {
                    category.classList.remove("hidden-scroll");
                }
            });
        });

document.addEventListener("DOMContentLoaded", () => {
    const documents = document.querySelectorAll(".document");
    const popup = document.getElementById("popup");
    const popupInfo = document.getElementById("popup-info");
    const closePopup = document.getElementById("close-popup");

    // Função para abrir o pop-up
    function openPopup(doc, link) {
        const dataInfo = JSON.parse(doc.getAttribute("data-info"));
        const complement = link.textContent; // Pega o nome do projeto ou ano
        const category = link.closest('.category').querySelector('h2').textContent; // Pega o título da categoria (Finanças ou Projetos)
        
        popupInfo.innerHTML = ""; // Limpa o conteúdo anterior
        
        // Adiciona o título com o elemento
        const complementTitle = document.createElement("h2");
        complementTitle.textContent = `${category} > ${complement}`; // Agora o título usa a categoria (Finanças ou Projetos)
        complementTitle.classList.add("popup-complement-title");
        popupInfo.appendChild(complementTitle);
        
        // Adiciona os documentos
        for (const [title, file] of Object.entries(dataInfo)) {
            const section = document.createElement("div");
            section.classList.add("popup-section");
            section.innerHTML = ` 
                <h3>${title}</h3>
                <div class="documents-inner" style="justify-content:center">
                    <div class="document" style="width:75px; height:100px; border-radius:10px">
                        <canvas></canvas>
                        <a href="${file}" target="_blank" style="border-radius:8px"><svg fill="#ffffEE" height="30px" width="30px" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 471.2 471.2" xml:space="preserve" stroke="#ffffEE"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path d="M457.7,230.15c-7.5,0-13.5,6-13.5,13.5v122.8c0,33.4-27.2,60.5-60.5,60.5H87.5c-33.4,0-60.5-27.2-60.5-60.5v-124.8 c0-7.5-6-13.5-13.5-13.5s-13.5,6-13.5,13.5v124.8c0,48.3,39.3,87.5,87.5,87.5h296.2c48.3,0,87.5-39.3,87.5-87.5v-122.8 C471.2,236.25,465.2,230.15,457.7,230.15z"></path> <path d="M226.1,346.75c2.6,2.6,6.1,4,9.5,4s6.9-1.3,9.5-4l85.8-85.8c5.3-5.3,5.3-13.8,0-19.1c-5.3-5.3-13.8-5.3-19.1,0l-62.7,62.8 V30.75c0-7.5-6-13.5-13.5-13.5s-13.5,6-13.5,13.5v273.9l-62.8-62.8c-5.3-5.3-13.8-5.3-19.1,0c-5.3,5.3-5.3,13.8,0,19.1 L226.1,346.75z"></path> </g> </g> </g></svg></a>
                    </div>
                </div>
            `;
            popupInfo.appendChild(section);
        }

        popup.classList.remove("hidden");
    }

    // Abrir pop-up para elementos com a classe fPU
    documents.forEach(doc => {
        const linkFPU = doc.querySelector("a.fPU"); // Seleciona o link dentro de cada "document" com a classe "fPU"
        
        if (linkFPU) {
            linkFPU.addEventListener("click", (e) => {
                e.preventDefault(); // Previne o comportamento padrão do link específico
                openPopup(doc, linkFPU);
            });
        }

        // Abrir pop-up para elementos com a classe pPU
        const linkPPU = doc.querySelector("a.pPU"); // Seleciona o link dentro de cada "document" com a classe "pPU"
        
        if (linkPPU) {
            linkPPU.addEventListener("click", (e) => {
                e.preventDefault(); // Previne o comportamento padrão do link específico
                openPopup(doc, linkPPU);
            });
        }

        // Abrir pop-up para elementos com a classe aPU
        const linkAPU = doc.querySelector("a.aPU"); // Seleciona o link dentro de cada "document" com a classe "aPU"
        
        if (linkAPU) {
            linkAPU.addEventListener("click", (e) => {
                e.preventDefault(); // Previne o comportamento padrão do link específico
                openPopup(doc, linkAPU);
            });
        }
    });

    // Fechar pop-up
    closePopup.addEventListener("click", () => {
        popup.classList.add("hidden");
    });

    popup.addEventListener("click", (e) => {
        if (e.target === popup) {
            popup.classList.add("hidden");
        }
    });
});

