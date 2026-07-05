import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pg from 'pg';

const { Pool } = pg;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: "*" }
});

// Captura a URL do banco ou assume uma string vazia para evitar quebras
const urlBanco = process.env.DATABASE_URL || "";

// Só vai exigir SSL se NÃO for localhost, NÃO for 127.0.0.1 E se a url não estiver vazia
const precisaSSL = urlBanco !== "" && !urlBanco.includes('localhost') && !urlBanco.includes('127.0.0.1');

const pool = new Pool({
    connectionString: urlBanco || 'postgres://local_user:local_password@localhost:5432/postgres', // Coloque seus dados locais padrão aqui se quiser ligar sem passar env
    ssl: precisaSSL ? { rejectUnauthorized: false } : false
});

const salas = {}; 

const LOCAIS = [
    { local: "Praia", dica: "Quente" },
    { local: "Avião", dica: "Aperto" },
    { local: "Estação Espacial", dica: "Silêncio" },
    { local: "Circo", dica: "Colorido" },
    { local: "Castelo Medieval", dica: "Frio" },
    { local: "Submarino", dica: "Fechado" },
    { local: "Fazenda", dica: "Trabalho" },
    { local: "Museu", dica: "Antigo" },
    { local: "Parque de Diversões", dica: "Gritos" },
    { local: "Estádio de Futebol", dica: "Multidão" },
    { local: "Biblioteca", dica: "Calma" },
    { local: "Cemitério", dica: "Respeito" },
    { local: "Laboratório Secreto", dica: "Cuidado" },
    { local: "Estação de Trem", dica: "Partidas" },
    { local: "Aeroporto", dica: "Pressa" },
    { local: "Estúdio de TV", dica: "Fama" },
    { local: "Parque Ibirapuera", dica: "Descanso" },
    { local: "Fábrica de Chocolate", dica: "Doce" },
    { local: "Zoológico", dica: "Curiosidade" },
    { local: "Estação de Metrô", dica: "Rapidez" },
    { local: "Caverna", dica: "Escuro" },
    { local: "Templo Antigo", dica: "Mistério" },
    { local: "Palácio Real", dica: "Luxo" },
    { local: "Ilha Deserta", dica: "Solidão" },
    { local: "Cidade Fantasma", dica: "Vazio" },
    { local: "Estação de Rádio", dica: "Vozes" },
    { local: "Parque Aquático", dica: "Energia" },
    { local: "Estação de Esqui", dica: "Frio" },
    { local: "Fábrica de Brinquedos", dica: "Criatividade" },
    { local: "Estação de Bombeiros", dica: "Urgência" },
    { local: "Estação de Polícia", dica: "Tensão" },
    { local: "Estação de Ônibus", dica: "Atraso" },
    { local: "Cinema", dica: "Escuro" },
    { local: "Teatro", dica: "Palco" },
    { local: "Hotel", dica: "Descanso" },
    { local: "Motel", dica: "Privacidade" },
    { local: "Posto de Gasolina", dica: "Parada" },
    { local: "Oficina Mecânica", dica: "Barulho" },
    { local: "Lavanderia", dica: "Limpeza" },
    { local: "Salão de Beleza", dica: "Espelho" },
    { local: "Barbearia", dica: "Corte" },
    { local: "Pet Shop", dica: "Carinho" },
    { local: "Loja de Roupas", dica: "Escolha" },
    { local: "Loja de Eletrônicos", dica: "Novidade" },
    { local: "Quadra de Basquete", dica: "Altura" },
    { local: "Quadra de Tênis", dica: "Precisão" },
    { local: "Piscina", dica: "Refresco" },
    { local: "Academia de Luta", dica: "Disciplina" },
    { local: "Pista de Skate", dica: "Equilíbrio" },
    { local: "Kartódromo", dica: "Velocidade" },
    { local: "Boliche", dica: "Pontaria" },
    { local: "Fliperama", dica: "Competição" },
    { local: "Campo de Golfe", dica: "Calma" },
    { local: "Ginásio", dica: "Torcida" },
    { local: "Floresta", dica: "Sombras" },
    { local: "Cachoeira", dica: "Refresco" },
    { local: "Rio", dica: "Correnteza" },
    { local: "Lago", dica: "Tranquilidade" },
    { local: "Montanha", dica: "Altitude" },
    { local: "Deserto", dica: "Secura" },
    { local: "Vulcão", dica: "Calor" },
    { local: "Glaciar", dica: "Gelo" },
    { local: "Pântano", dica: "Lama" },
    { local: "Jardim Botânico", dica: "Verde" },
    { local: "Porto", dica: "Carga" },
    { local: "Heliporto", dica: "Pressa" },
    { local: "Pedágio", dica: "Espera" },
    { local: "Rodovia", dica: "Velocidade" },
    { local: "Ponte", dica: "Travessia" },
    { local: "Túnel", dica: "Eco" },
    { local: "Garagem", dica: "Proteção" },
    { local: "Estacionamento", dica: "Vagas" },
    { local: "Ponto de Táxi", dica: "Corrida" },
    { local: "Teleférico", dica: "Vista" },
    { local: "Prefeitura", dica: "Burocracia" },
    { local: "Fórum", dica: "Decisão" },
    { local: "Cartório", dica: "Papéis" },
    { local: "Correios", dica: "Entrega" },
    { local: "Praça", dica: "Encontro" },
    { local: "Feira Livre", dica: "Movimento" },
    { local: "Feira de Ciências", dica: "Curiosidade" },
    { local: "Centro Comunitário", dica: "Reunião" },
    { local: "Biblioteca Pública", dica: "Silêncio" },
    { local: "Centro Cultural", dica: "Expressão" },
    { local: "Universidade", dica: "Futuro" },
    { local: "Creche", dica: "Infância" },
    { local: "Curso de Idiomas", dica: "Comunicação" },
    { local: "Laboratório Escolar", dica: "Experiência" },
    { local: "Sala de Informática", dica: "Tecnologia" },
    { local: "Call Center", dica: "Telefone" },
    { local: "Centro de Distribuição", dica: "Organização" },
    { local: "Depósito", dica: "Caixas" },
    { local: "Construção", dica: "Poeira" },
    { local: "Gráfica", dica: "Impressão" },
    { local: "Fábrica", dica: "Produção" },
    { local: "Cozinha Industrial", dica: "Agilidade" },
    { local: "Estúdio Fotográfico", dica: "Pose" },
    { local: "Aquário", dica: "Azul" },
    { local: "Planetário", dica: "Curiosidade" },
    { local: "Observatório", dica: "Distância" },
    { local: "Escape Room", dica: "Enigmas" },
    { local: "Cassino", dica: "Risco" },
    { local: "Parque Eólico", dica: "Vento" },
    { local: "Usina Hidrelétrica", dica: "Energia" },
    { local: "Farol", dica: "Luz" },
    { local: "Pirâmides do Egito", dica: "Antigo" },
    { local: "Muralha da China", dica: "Extensão" },
    { local: "Torre Eiffel", dica: "Turismo" },
    { local: "Cristo Redentor", dica: "Paisagem" },
    { local: "Coliseu", dica: "História" },
    { local: "Disney", dica: "Magia" },
    { local: "Las Vegas", dica: "Luzes" },
    { local: "Central Park", dica: "Descanso" },
    { local: "Área 51", dica: "Segredo" },
    { local: "Minecraft", dica: "Criatividade" },
    { local: "Ilha do Fortnite", dica: "Sobrevivência" },
    { local: "Bikini Bottom", dica: "Humor" },
    { local: "Fenda do Biquíni", dica: "Diversão" },
    { local: "Laboratório do Dexter", dica: "Invenção" },
    { local: "Acampamento Meio-Sangue (", dica: "Treinamento" },
    { local: "Nave Alienígena", dica: "Estranho" },
    { local: "Navio Fantasma", dica: "Névoa" },
    { local: "Cidade Subterrânea", dica: "Profundo" },
    { local: "Mundo Virtual", dica: "Conexão" },
    { local: "Planeta Desconhecido", dica: "Exploração" },
    { local: "Dimensão Paralela", dica: "Inverso" },
    { local: "Castelo Assombrado", dica: "Arrepio" },
    { local: "Laboratório de Magia", dica: "Imprevisível" },
    { local: "Cidade Flutuante", dica: "Leveza" },
    { local: "Mundo dos Sonhos", dica: "Confuso" },
    { local: "Ilha Misteriosa", dica: "Segredos" },
    { local: "Escritório", dica: "Reunião" },
    { local: "Caverna Subterrânea", dica: "Escuridão" },
    { local: "Templo Antigo", dica: "Mistério" },
    { local: "Palácio Real", dica: "Luxo" },
    { local: "Vila do Chaves", dica: "Comédia" },
    { local: "Hogwarts", dica: "Tradição" },
    { local: "Mordor", dica: "Perigo" },
    { local: "Nárnia", dica: "Fantasia" },
    { local: "Wakanda", dica: "Avanço" },
    { local: "Gotham City", dica: "Caos" },
    { local: "Metropolis", dica: "Esperança" },
    { local: "Asgard (Thor)", dica: "Grandeza" },
    { local: "Springfield", dica: "Rotina" },
    { local: "Silent Hill", dica: "Névoa" },
    { local: "Casa Mal Assombrada", dica: "Ruídos" }
];

io.on('connection', (socket) => {
    console.log(`Usuário conectado: ${socket.id}`);

    // EVENTO: Criar Sala
    socket.on('criarSala', ({ nomeJogador }) => {
        const codigoSala = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        salas[codigoSala] = {
            id: codigoSala,
            liderId: socket.id,
            jogadores: [{ id: socket.id, nome: nomeJogador, entrada: new Date() }],
            estado: 'lobby',
            partidaAtualId: null // Guardará o ID do banco da rodada ativa
        };

        socket.join(codigoSala);
        socket.emit('salaCriada', { codigoSala, jogadores: salas[codigoSala].jogadores });
    });

    // EVENTO: Entrar na Sala
    socket.on('entrarSala', ({ codigoSala, nomeJogador }) => {
        const sala = salas[codigoSala.toUpperCase()];
        
        if (!sala) return socket.emit('erro', 'Sala não encontrada!');
        if (sala.estado !== 'lobby') return socket.emit('erro', 'O jogo já começou!');

        sala.jogadores.push({ id: socket.id, nome: nomeJogador, entrada: new Date() });
        socket.join(codigoSala);

        io.to(codigoSala).emit('atualizarJogadores', { 
            jogadores: sala.jogadores, 
            liderId: sala.liderId 
        });
    });

    // EVENTO: Expulsar Jogador
    socket.on('expulsarJogador', ({ codigoSala, jogadorId }) => {
        const sala = salas[codigoSala];
        if (!sala || sala.liderId !== socket.id) return;

        sala.jogadores = sala.jogadores.filter(j => j.id !== jogadorId);
        io.to(jogadorId).emit('foiExpulso');
        io.to(codigoSala).emit('atualizarJogadores', { 
            jogadores: sala.jogadores, 
            liderId: sala.liderId 
        });
    });

    // EVENTO: Iniciar Jogo (Salva no Banco)
    socket.on('iniciarJogo', async ({ codigoSala, usarDicas }) => {
        
        const sala = salas[codigoSala.toUpperCase()];
        if (!sala) return socket.emit('erro', 'Sala não encontrada em memória!');

        const jogadores = sala.jogadores;

        if (!jogadores || jogadores.length < 3) {
            return socket.emit('erro', 'É necessário pelo menos 3 jogadores para iniciar o jogo.');
        }

        try {
            // 1. Sorteia um local da nossa lista oficial
            const localSorteado = LOCAIS[Math.floor(Math.random() * LOCAIS.length)];
            
            // 2. Salva a nova partida no banco (Apontando para o schema impostor)
            const novaPartida = await pool.query(
                `INSERT INTO impostor.partidas (codigo_sala, palavra_sorteada, dicas_ativadas, data_hora_inicio) 
                VALUES ($1, $2, $3, NOW()) RETURNING id`,
                [codigoSala, localSorteado.local, usarDicas || false]
            );
            
            const partidaId = novaPartida.rows[0].id;
            
            sala.partidaAtualId = partidaId;
            sala.estado = 'jogo';

            // 3. CORREÇÃO: Atualiza os jogadores na tabela correta (impostor.jogadores_partida)
            // Como no lobby em memória você já tem os jogadores, salvamos a referência deles no banco agora
            for (const jogador of jogadores) {
                await pool.query(
                    `INSERT INTO impostor.jogadores_partida (partida_id, nome_jogador, socket_id) 
                     VALUES ($1, $2, $3)`,
                    [partidaId, jogador.nome, jogador.id]
                );
            }

            // 4. Sorteia quem será o Impostor do grupo usando as conexões reais
            const indiceAleatorio = Math.floor(Math.random() * jogadores.length);
            const impostorId = jogadores[indiceAleatorio].id;

            // 5. Envia o resultado individualmente usando os sockets corretos em memória
            jogadores.forEach(jogador => {
                const ehImpostor = (jogador.id === impostorId);
                console.log(usarDicas, ehImpostor, localSorteado.dica);
                console.log("Deve usar dicas e é impostor?", usarDicas && ehImpostor);
                
                io.to(jogador.id).emit('resultadoSorteio', {
                    papel: ehImpostor ? 'impostor' : 'inocente',
                    local: ehImpostor ? '???' : localSorteado.local,
                    dica: (usarDicas && ehImpostor) ? localSorteado.dica : null
                });
            });

            console.log(`Partida ${partidaId} iniciada com sucesso e gravada no Postgres local!`);

        } catch (err) {
            console.error("Erro crítico ao iniciar rodada no Postgres:", err);
            socket.emit('erro', 'Erro ao iniciar a partida no servidor.');
        }
    });

    // EVENTO: Voltar para o Lobby (Atualiza o fim no Banco)
    socket.on('voltarLobby', async ({ codigoSala }) => {
        const sala = salas[codigoSala.toUpperCase()];
        if (!sala || sala.liderId !== socket.id) return;

        if (sala.partidaAtualId) {
            try {
                // Ajustado para impostor.partidas
                const queryFim = `
                    UPDATE impostor.partidas 
                    SET data_hora_fim = CURRENT_TIMESTAMP 
                    WHERE id = $1;
                `;
                await pool.query(queryFim, [sala.partidaAtualId]);
                console.log(`Partida ${sala.partidaAtualId} finalizada no banco.`);
            } catch (err) {
                console.error("Erro ao atualizar fim da partida:", err);
            }
            sala.partidaAtualId = null;
        }

        sala.estado = 'lobby';
        io.to(codigoSala.toUpperCase()).emit('retornadoAoLobby');
    });

    socket.on('disconnect', () => {
        console.log(`Usuário desconectado: ${socket.id}`);
        // Logica de remoção do jogador da sala caso queira implementar futuramente
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Servidor rodando e conectado ao banco na porta ${PORT}`);
});