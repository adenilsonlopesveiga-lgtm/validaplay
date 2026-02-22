const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

const resendApiKey = defineSecret("RESEND_API_KEY");

let resend;

// ==================================================
// 1️⃣ ENVIO DE EMAIL VIA SITE
// ==================================================
exports.enviarEmail = onRequest(
    {
      secrets: [resendApiKey],
      cors: true,
    },
    async (req, res) => {
      if (req.method === "OPTIONS") return res.status(204).send("");
      if (req.method !== "POST") {
        return res.status(405).send("Método não permitido");
      }

      try {
        const {
          email,
          nome,
          tipo,
          linkTeste,
          quantidade,
          prazo,
          instrucoes,
        } = req.body || {};

        if (!email || !nome || !email.includes("@")) {
          return res.status(400).send("Dados inválidos");
        }

        if (!resend) {
          resend = new Resend(resendApiKey.value());
        }

        let assuntoUsuario = "";
        let mensagemUsuario = "";

        if (tipo === "empresa") {
          assuntoUsuario = "Solicitação recebida - ValidaPlay";
          mensagemUsuario = `
  <h2>Solicitação recebida</h2>
  <p>App: <strong>${nome}</strong></p>
  <p>Quantidade: ${quantidade || "-"}</p>
  <p>Prazo: ${prazo || "-"}</p>
  <p>Link de teste: ${linkTeste || "-"}</p>
  <p>Instruções: ${instrucoes || "-"}</p>
`;
        } else {
          assuntoUsuario = "Cadastro recebido 🎉";
          mensagemUsuario = `
          <h2>Cadastro confirmado 🎉</h2>
          <p>Olá ${nome},</p>
          <p>Seu cadastro foi recebido.</p>
        `;
        }

        await resend.emails.send({
          from: "ValidaPlay <noreply@validaplay.com.br>",
          to: email,
          subject: assuntoUsuario,
          html: mensagemUsuario,
        });

        return res.status(200).json({success: true});
      } catch (error) {
        console.error(error);
        return res.status(500).json({error: "Erro ao enviar email"});
      }
    },
);

// ==================================================
// 2️⃣ TESTADOR APROVADO
// ==================================================
exports.onTestadorAprovado = onDocumentUpdated(
    {
      document: "testadores/{id}",
      secrets: [resendApiKey],
    },
    async (event) => {
      const before = event.data.before ? event.data.before.data() : null;
      const after = event.data.after ? event.data.after.data() : null;
      if (!before || !after) return;

      if (before.status !== "pendente") return;
      if (after.status !== "aprovado") return;

      if (!resend) {
        resend = new Resend(resendApiKey.value());
      }

      await resend.emails.send({
        from: "ValidaPlay <contato@validaplay.com.br>",
        to: after.email,
        subject: "Você foi aprovado 🎉",
        html: `<h2>Cadastro aprovado</h2><p>Bem-vindo à ValidaPlay.</p>`,
      });

      console.log("Email enviado para testador aprovado.");
    },
);

// ==================================================
// 3️⃣ CLIENTE APROVADO → CRIA MISSÕES AUTOMÁTICAS
// ==================================================
exports.onClienteAprovado = onDocumentUpdated(
    {
      document: "solicitacoes/{id}",
      secrets: [resendApiKey],
    },
    async (event) => {
      const before = event.data.before ? event.data.before.data() : null;
      const after = event.data.after ? event.data.after.data() : null;
      if (!before || !after) return;

      if (before.status !== "pendente") return;
      if (after.status !== "aprovado") return;

      if (!resend) {
        resend = new Resend(resendApiKey.value());
      }

      const solicitacaoId = event.params.id;

      // Buscar testadores aprovados
      const testadoresSnap = await db
          .collection("testadores")
          .where("status", "==", "aprovado")
          .limit(after.quantidade)
          .get();

      if (testadoresSnap.empty) {
        console.log("Nenhum testador disponível.");
        return;
      }

      const batch = db.batch();

      for (const docSnap of testadoresSnap.docs) {
        const testador = docSnap.data();
        const testadorId = docSnap.id;

        const missaoRef = db.collection("missoes").doc();

        batch.set(missaoRef, {
          solicitacaoId,
          clienteId: after.clienteId,
          testadorId,
          nomeApp: after.nomeApp,
          linkTeste: after.linkTeste,
          totalDias: 14,
          diaAtual: 1,
          status: "em_andamento",
          criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Criar 14 dias
        for (let i = 1; i <= 14; i++) {
          const diaRef = missaoRef.collection("dias").doc(String(i));

          batch.set(diaRef, {
            numero: i,
            status: "pendente",
            printUrl: "",
            dataEnvio: null,
            dataValidacao: null,
          });
        }

        // Enviar email para testador
        await resend.emails.send({
          from: "ValidaPlay <contato@validaplay.com.br>",
          to: testador.email,
          subject: "Nova missão disponível 🚀",
          html: `
          <h2>Nova missão disponível</h2>
          <p>App: <strong>${after.nomeApp}</strong></p>
          <p>Link: ${after.linkTeste}</p>
          <p>Duração: 14 dias</p>
        `,
        });
      }

      await batch.commit();

      console.log("Missões criadas automaticamente.");
    },
);
// ==================================================
// 4️⃣ EXCLUSÃO COMPLETA DE USUÁRIO (ADMIN ONLY)
// ==================================================
const {onCall} = require("firebase-functions/v2/https");

exports.excluirUsuarioCompleto = onCall(
    {
      region: "us-central1",
    },
    async (request) => {
      const {uid, colecao} = request.data;
      const auth = request.auth;

      if (!auth) {
        throw new Error("Usuário não autenticado.");
      }

      const userDoc = await db.collection("usuarios").doc(auth.uid).get();

      if (!userDoc.exists || userDoc.data().tipo !== "admin") {
        throw new Error("Acesso negado.");
      }

      if (!uid || !colecao) {
        throw new Error("Dados inválidos.");
      }

      // 🔥 Sempre excluir Firestore
      await db.collection(colecao).doc(uid).delete();

      // 🔥 Só excluir do Auth se for testador ou usuario
      if (colecao === "testadores" || colecao === "usuarios") {
        try {
          await admin.auth().deleteUser(uid);
        } catch (error) {
          console.log("Usuário não existe no Auth ou já foi removido.");
        }
      }

      return {sucesso: true};
    },
);
exports.criarMissoesManual = onCall(async (request) => {
  const {solicitacaoId} = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new Error("Usuário não autenticado.");
  }

  const userDoc = await db.collection("usuarios").doc(auth.uid).get();

  if (!userDoc.exists || userDoc.data().tipo !== "admin") {
    throw new Error("Acesso negado.");
  }

  const solicitacaoRef = db.collection("solicitacoes").doc(solicitacaoId);
  const solicitacaoSnap = await solicitacaoRef.get();

  if (!solicitacaoSnap.exists) {
    throw new Error("Solicitação não encontrada.");
  }

  const solicitacao = solicitacaoSnap.data();

  const quantidade = solicitacao.quantidade || 1;

  const testadoresSnap = await db
      .collection("testadores")
      .where("status", "==", "aprovado")
      .limit(quantidade)
      .get();

  if (testadoresSnap.empty) {
    throw new Error("Nenhum testador aprovado disponível.");
  }

  const batch = db.batch();

  for (const docSnap of testadoresSnap.docs) {
    const missaoRef = db.collection("missoes").doc();

    batch.set(missaoRef, {
      solicitacaoId,
      testadorId: docSnap.id,
      status: "em_andamento",
      diaAtual: 1,
      totalDias: 14,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    for (let i = 1; i <= 14; i++) {
      const diaRef = missaoRef.collection("dias").doc(String(i));

      batch.set(diaRef, {
        numero: i,
        status: "pendente",
      });
    }
  }

  batch.update(solicitacaoRef, {
    missoesCriadas: true,
  });

  await batch.commit();

  return {sucesso: true};
});
