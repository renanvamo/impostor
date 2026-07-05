// Conecta com o servidor backend
const URL_BACKEND = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://impostor-x1c9.onrender.com';

const socket = io(URL_BACKEND);

// Variáveis de estado local
let salaAtual = null;
let meuNome = "";
let ehLider = false;

// Elementos das Telas
const telaLogin = document.getElementById('tela-login');
const telaSetup = document.getElementById('tela-setup');
const telaJogo = document.getElementById('tela-jogo');

// Elementos de Inputs e Botões
const inputNome = document.getElementById('nome');
const inputCodigo = document.getElementById('codigo-sala');
const btnCriar = document.getElementById('btn-criar');
const btnEntrar = document.getElementById('btn-entrar');
const btnJogar = document.getElementById('btn-jogar');
const btnVoltar = document.getElementById('btn-voltar');

// Elementos de Exibição
const codigoExibido = document.getElementById('codigo-exibido');
const listaJogadores = document.getElementById('lista-jogadores');
const controlesLider = document.getElementById('controles-lider');
const msgEspera = document.getElementById('msg-espera');
const papelJogador = document.getElementById('papel-jogador');
const labelRevelacao = document.getElementById('label-revelacao');
const palavraSecreta = document.getElementById('palavra-secreta');
const controlesFimJogo = document.getElementById('controles-fim-jogo');

const chkDicas = document.getElementById('chk-dicas');
const containerDica = document.getElementById('container-dica');
const textoDica = document.getElementById('texto-dica');

const toastErro = document.getElementById('toast-erro');
const msgErroTexto = document.getElementById('msg-erro-texto');
let temporizadorErro = null;

// ==========================================
// FUNÇÕES DE NAVEGAÇÃO ENTRE TELAS
// ==========================================
function irParaTela(telaAlvo) {
    telaLogin.classList.add('oculto');
    telaSetup.classList.add('oculto');
    telaJogo.classList.add('oculto');
    
    telaAlvo.classList.remove('oculto');
}

// ==========================================
// EVENTOS DE CLICK (AÇÕES DO JOGADOR)
// ==========================================

// Criar Sala
btnCriar.addEventListener('click', () => {
    meuNome = inputNome.value.trim();
    if (!meuNome) return mostrarErro("Por favor, digite seu nome!");    
    socket.emit('criarSala', { nomeJogador: meuNome });
});

// Entrar na Sala
btnEntrar.addEventListener('click', () => {
    meuNome = inputNome.value.trim();
    const codigo = inputCodigo.value.trim().toUpperCase();
    
    if (!meuNome) return mostrarErro("Por favor, digite seu nome!");
    if (!codigo) return mostrarErro("Por favor, digite o código da sala!");
    
    socket.emit('entrarSala', { codigoSala: codigo, nomeJogador: meuNome });
});

// Iniciar o Jogo (Apenas o Líder dispara)
btnJogar.addEventListener('click', () => {
    if (salaAtual) {
        const usarDicas = chkDicas.checked; // true ou false
        socket.emit('iniciarJogo', { codigoSala: salaAtual, usarDicas: chkDicas.checked });
    }
});

// Voltar para o Lobby/Setup (Apenas Líder)
btnVoltar.addEventListener('click', () => {
    if (salaAtual) {
        socket.emit('voltarLobby', { codigoSala: salaAtual });
    }
});

// Função para disparar a expulsion de alguém
function expulsar(jogadorId) {
    if (salaAtual) {
        socket.emit('expulsarJogador', { codigoSala: salaAtual, jogadorId });
    }
}

// ==========================================
// RESPOSTAS DO SERVIDOR (SOCKET.IO)
// ==========================================

// Tratamento de erros vindo do servidor
socket.on('erro', (msg) => {
    mostrarErro(msg);
});

// Quando a sala é criada com sucesso
socket.on('salaCriada', ({ codigoSala, jogadores }) => {
    salaAtual = codigoSala;
    ehLider = true; // Define como líder no estado global
    codigoExibido.innerText = codigoSala;
    irParaTela(telaSetup);

    const txtCodigo = document.getElementById('txt-codigo-sala');
    if (txtCodigo) txtCodigo.innerText = codigoSala;
    
    controlesLider.classList.remove('oculto');
    msgEspera.classList.add('oculto');
    
    atualizarListaInterface(jogadores, socket.id);
});

// Atualização constante da lista de jogadores na sala
socket.on('atualizarJogadores', ({ jogadores, liderId }) => {
    // Se a pessoa não estava com sala salva (entrou agora via código)
    if (!salaAtual) {
        salaAtual = inputCodigo.value.trim().toUpperCase();
        codigoExibido.innerText = salaAtual;
        irParaTela(telaSetup);
        
        const txtCodigo = document.getElementById('txt-codigo-sala');
        if (txtCodigo) txtCodigo.innerText = salaAtual;
    }

    // RESOLUÇÃO DO ERRO: Atualiza dinamicamente se você é o líder ou não nesta rodada
    ehLider = (socket.id === liderId);

    // Gerencia o que aparece se for o líder ou mero jogador
    if (ehLider) {
        controlesLider.classList.remove('oculto');
        msgEspera.classList.add('oculto');
    } else {
        controlesLider.classList.add('oculto');
        msgEspera.classList.remove('oculto');
    }

    atualizarListaInterface(jogadores, liderId);
});

// Desenha a lista de jogadores na tela e põe o botão "X" se for o líder
function atualizarListaInterface(jogadores, liderId) {
    listaJogadores.innerHTML = "";
    
    jogadores.forEach(j => {
        const li = document.createElement('li');
        
        // Nome do jogador (Sinaliza se for você ou o líder)
        let sufixo = "";
        if (j.id === socket.id) sufixo += " (Você)";
        if (j.id === liderId) sufixo += " 👑";
        
        li.innerText = `${j.nome}${sufixo}`;
        
        // Se eu sou o líder e o jogador da linha não sou eu, coloco botão de expulsar
        if (socket.id === liderId && j.id !== socket.id) {
            const btnExpulsar = document.createElement('button');
            btnExpulsar.innerHTML = "&times;";
            btnExpulsar.className = "btn-expulsar";
            btnExpulsar.onclick = () => expulsar(j.id);
            li.appendChild(btnExpulsar);
        }
        
        listaJogadores.appendChild(li);
    });
}

// Jogador foi expulso pelo líder
socket.on('foiExpulso', () => {
    mostrarErro("Você foi expulso da sala pelo líder!");
    salaAtual = null;
    ehLider = false;
    irParaTela(telaLogin);
});

// Resultado do sorteio (Transição para a tela de jogo)
socket.on('resultadoSorteio', ({ papel, local, dica }) => {
    // Transiciona o usuário para a tela onde a palavra aparece
    irParaTela(telaJogo);
    
    // Limpa os dados de dicas de rodadas anteriores
    containerDica.classList.add('oculto');
    textoDica.innerText = "";

    // Evita erros de undefined forçando o local a virar uma string válida
    const localTexto = String(local || '').toUpperCase();

    // Configura o visual da tela dependendo do papel sorteado pelo servidor
    if (papel === 'impostor') {
        papelJogador.innerText = "VOCÊ É O IMPOSTOR";
        papelJogador.className = "titulo-papel impostor-style";
        labelRevelacao.innerText = "Descubra o local secreto sem que descubram você!";
        palavraSecreta.innerText = "???";
        console.log ("Dica recebida do servidor:", dica);
        console.log ("Papel do jogador:", papel);
        console.log ("É líder?", ehLider);
        // Se o líder ativou as dicas e você é inocente, a dica é exibida aqui
        if (dica) {
            containerDica.classList.remove('oculto');
            textoDica.innerText = dica;
        } else {
            containerDica.classList.add('oculto');
        }
    } else {
        papelJogador.innerText = "VOCÊ É INOCENTE";
        papelJogador.className = "titulo-papel inocente-style";
        labelRevelacao.innerText = "O local secreto é:";
        palavraSecreta.innerText = localTexto;
        

    }
    
    // Agora o sistema reconhece perfeitamente quem é o líder da sala!
    if (ehLider) {
        controlesFimJogo.classList.remove('oculto');
    } else {
        controlesFimJogo.classList.add('oculto');
    }
});

// Voltar para o Lobby
socket.on('retornadoAoLobby', () => {
    irParaTela(telaSetup);
});

function mostrarErro(mensagem) {
    msgErroTexto.innerText = mensagem; // CORRIGIDO: de mensaje para mensagem
    toastErro.classList.remove('oculto');

    // Se o usuário gerar outro erro antes do anterior sumir, limpa o tempo antigo
    if (temporizadorErro) {
        clearTimeout(temporizadorErro);
    }

    // O erro some automaticamente após 4 segundos (4000 milissegundos)
    temporizadorErro = setTimeout(() => {
        toastErro.classList.add('oculto');
    }, 4000);
}