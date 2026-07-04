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

// Configuração da conexão com o seu Postgres no Docker
const pool = new Pool({
    user: 'postgres',          // seu usuário do banco
    host: 'localhost',
    database: 'impostor_db',   // nome do banco de dados que você criou
    password: 'sua_senha_aqui', // sua senha do banco
    port: 5432,
});

const salas = {}; 

const LOCAIS = [
    "Praia", "Navio Fantasma", "Hospital", "Avião", "Estação Espacial",
    "Circo", "Castelo Medieval", "Submarino", "Supermercado", "Escola"
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
    socket.on('iniciarJogo', async ({ codigoSala }) => {
        const sala = salas[codigoSala];
        if (!sala || sala.liderId !== socket.id || sala.jogadores.length < 3) {
            return socket.emit('erro', 'Mínimo de 3 jogadores para iniciar!');
        }

        sala.estado = 'jogando';
        
        const localSorteado = LOCAIS[Math.floor(Math.random() * LOCAIS.length)];
        const indiceImpostor = Math.floor(Math.random() * sala.jogadores.length);
        const impostor = sala.jogadores[indiceImpostor];

        try {
            // 1. Salva a nova partida na tabela 'partidas'
            const queryPartida = `
                INSERT INTO partidas (codigo_sala, palavra_sorteada) 
                VALUES ($1, $2) RETURNING id;
            `;
            const resPartida = await pool.query(queryPartida, [codigoSala, localSorteado]);
            const partidaId = resPartida.rows[0].id;
            sala.partidaAtualId = partidaId; // Atribui à sala o ID gerado pelo Postgres

            // 2. Salva todos os jogadores atuais atrelados a essa partida
            for (const jogador of sala.jogadores) {
                const queryJogador = `
                    INSERT INTO jogadores_partida (partida_id, nome_jogador, socket_id, horario_entrada)
                    VALUES ($1, $2, $3, $4);
                `;
                await pool.query(queryJogador, [partidaId, jogador.nome, jogador.id, jogador.entrada]);
            }

            console.log(`Partida ${partidaId} registrada com sucesso no banco.`);
        } catch (err) {
            console.error("Erro ao salvar dados no Postgres:", err);
        }

        // Distribui os papéis para as telas
        sala.jogadores.forEach(jogador => {
            if (jogador.id === impostor.id) {
                io.to(jogador.id).emit('resultadoSorteio', { papel: 'impostor', local: '???' });
            } else {
                io.to(jogador.id).emit('resultadoSorteio', { papel: 'inocente', local: localSorteado });
            }
        });
    });

    // EVENTO: Voltar para o Lobby (Atualiza o fim no Banco)
    socket.on('voltarLobby', async ({ codigoSala }) => {
        const sala = salas[codigoSala];
        if (!sala || sala.liderId !== socket.id) return;

        // Se houver uma partida registrada, atualiza a data_hora_fim
        if (sala.partidaAtualId) {
            try {
                const queryFim = `
                    UPDATE partidas 
                    SET data_hora_fim = CURRENT_TIMESTAMP 
                    WHERE id = $1;
                `;
                await pool.query(queryFim, [sala.partidaAtualId]);
                console.log(`Partida ${sala.partidaAtualId} finalizada no banco.`);
            } catch (err) {
                console.error("Erro ao atualizar fim da partida:", err);
            }
            sala.partidaAtualId = null; // Reseta o ID para a próxima rodada
        }

        sala.estado = 'lobby';
        io.to(codigoSala).emit('retornadoAoLobby');
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