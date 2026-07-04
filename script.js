// Conecta com o servidor backend
const socket = io('http://localhost:3000');

// Variáveis de estado local
let salaAtual = null;
let meuNome = "";

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
    if (!meuNome) return alert("Por favor, digite seu nome!");
    
    socket.emit('criarSala', { nomeJogador: meuNome });
});

// Entrar na Sala
btnEntrar.addEventListener('click', () => {
    meuNome = inputNome.value.trim();
    const codigo = inputCodigo.value.trim().toUpperCase();
    
    if (!meuNome) return alert("Por favor, digite seu nome!");
    if (!codigo) return alert("Por favor, digite o código da sala!");
    
    socket.emit('entrarSala', { codigoSala: codigo, nomeJogador: meuNome });
});

// Iniciar Partida (Apenas Líder)
btnJogar.addEventListener('click', () => {
    if (salaAtual) {
        socket.emit('iniciarJogo', { codigoSala: salaAtual });
    }
});

// Voltar para o Lobby/Setup (Apenas Líder)
btnVoltar.addEventListener('click', () => {
    if (salaAtual) {
        socket.emit('voltarLobby', { codigoSala: salaAtual });
    }
});

// Função para disparar a expulsão de alguém
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
    alert(msg);
});

// Quando a sala é criada com sucesso
socket.on('salaCriada', ({ codigoSala, jogadores }) => {
    salaAtual = codigoSala;
    codigoExibido.innerText = codigoSala;
    irParaTela(telaSetup);
    
    // Como acabou de criar, ele é o líder
    controlesLider.classList.remove('oculto');
    msgEspera.classList.add('oculto');
    
    atualizarListaInterface(jogadores, socket.id);
});

// Atualização constante da lista de jogadores na sala
socket.on('atualizarJogadores', ({ jogadores, liderId }) => {
    // Se a pessoa não estava com sala salva (entrou agora)
    if (!salaAtual) {
        salaAtual = inputCodigo.value.trim().toUpperCase();
        codigoExibido.innerText = salaAtual;
        irParaTela(telaSetup);
    }

    // Gerencia o que aparece se for o líder ou mero jogador
    if (socket.id === liderId) {
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
    alert("Você foi expulso da sala pelo líder!");
    salaAtual = null;
    irParaTela(telaLogin);
});

// Resultado do sorteio (Transição para a tela de jogo)
socket.on('resultadoSorteio', ({ papel, local }) => {
    irParaTela(telaJogo);
    
    // Altera estilos com base no papel secreto recebido de forma segura
    if (papel === 'impostor') {
        papelJogador.innerText = "VOCÊ É O IMPOSTOR";
        papelJogador.className = "titulo-papel impostor-style";
        labelRevelacao.innerText = "Descubra o local sem ser pego!";
        palavraSecreta.innerText = "???";
    } else {
        papelJogador.innerText = "VOCÊ É INOCENTE";
        papelJogador.className = "titulo-papel inocente-style";
        labelRevelacao.innerText = "O local secreto é:";
        palavraSecreta.innerText = local.toUpperCase();
    }

    // Só exibe o botão de voltar para o líder gerenciar a sala
    // Descobrimos se ele é o lider olhando se o botão de jogar do setup estava visível
    if (!controlesLider.classList.contains('oculto')) {
        controlesFimJogo.classList.remove('oculto');
    } else {
        controlesFimJogo.classList.add('oculto');
    }
});

// Voltar para o Lobby
socket.on('retornadoAoLobby', () => {
    irParaTela(telaSetup);
});