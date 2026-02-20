const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");

setGlobalOptions({maxInstances: 10});

const resendApiKey = defineSecret("RESEND_API_KEY");

// reutilização da conexão (MUITO importante em v2)
let resend;


// ==================================================
// 1️⃣ CADASTRO VIA SITE (APENAS CONFIRMA RECEBIMENTO)
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
          whatsapp,
          tipoCelular,
          modelo,
          versao,
          tipo,
          linkTeste,
          quantidade,
          prazo,
          instrucoes,
        } = req.body || {};

        // 🛡️ proteção anti-bot
        if (!email || !nome || !email.includes("@")) {
          return res.status(400).send("Dados inválidos");
        }

        if (!resend) {
          resend = new Resend(resendApiKey.value());
        }

        // ==========================
        // EMAIL PARA O USUÁRIO
        // ==========================
        let assuntoUsuario = "";
        let mensagemUsuario = "";

        if (tipo === "empresa") {
          assuntoUsuario = "Solicitação recebida - ValidaPlay";

          mensagemUsuario = `
<h2>Sua solicitação foi recebida com sucesso</h2>

<p>Olá,</p>

<p>
Recebemos o cadastro do seu aplicativo <strong>${nome}</strong> na plataforma <strong>ValidaPlay</strong>.
</p>

<p>
Nossa equipe irá analisar as informações enviadas e organizar os próximos passos para a validação.
</p>

<p><strong>O que acontece agora:</strong></p>

<ul>
  <li>Revisão dos dados enviados</li>
  <li>Organização da base de testadores</li>
  <li>Início do planejamento do período de teste</li>
</ul>

<p>
Você receberá uma confirmação assim que o processo for aprovado.
</p>

<br>

<p>
Atenciosamente,<br>
<strong>Equipe ValidaPlay</strong><br>
Plataforma brasileira de validação de aplicativos
</p>
`;
        } else {
          assuntoUsuario = "Cadastro recebido 🎉";

          mensagemUsuario = `
<h2>Cadastro confirmado 🎉</h2>

<p>Olá ${nome},</p>

<p>
Seu cadastro como <strong>testador oficial da ValidaPlay</strong> foi recebido com sucesso.
</p>

<p><strong>Como funciona:</strong></p>

<ul>
  <li>Você receberá convites compatíveis com seu perfil</li>
  <li>Os testes têm duração média de 14 dias</li>
  <li>É necessário utilizar o aplicativo diariamente</li>
</ul>

<p>
Após a conclusão correta do teste, o pagamento será realizado conforme combinado.
</p>

<p>
Fique atento ao seu email e WhatsApp para não perder oportunidades.
</p>

<br>

<p>
<strong>Equipe ValidaPlay</strong>
</p>
`;
        }

        await resend.emails.send({
          from: "ValidaPlay <noreply@validaplay.com.br>",
          to: email,
          subject: assuntoUsuario,
          html: mensagemUsuario,
        });

        // ==========================
        // EMAIL PARA ADMIN
        // ==========================
        let assuntoAdmin = "";
        let mensagemAdmin = "";

        if (tipo === "empresa") {
          assuntoAdmin = "🚨 Novo cliente interessado - ValidaPlay";

          mensagemAdmin = `
<h2>Novo pedido de testes</h2>
<p><strong>Aplicativo:</strong> ${nome}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>Link:</strong> ${linkTeste || "-"}</p>
<p><strong>Quantidade:</strong> ${quantidade || "-"}</p>
<p><strong>Prazo:</strong> ${prazo || "-"}</p>
<p><strong>Instruções:</strong> ${instrucoes || "-"}</p>
`;
        } else {
          assuntoAdmin = "Novo testador cadastrado 🚀";

          mensagemAdmin = `
<p><strong>Nome:</strong> ${nome}</p>
<p><strong>Email:</strong> ${email}</p>
<p><strong>WhatsApp:</strong> ${whatsapp || "-"}</p>
<p><strong>Celular:</strong> ${tipoCelular || "-"}</p>
<p><strong>Modelo:</strong> ${modelo || "-"}</p>
<p><strong>Versão:</strong> ${versao || "-"}</p>
`;
        }

        await resend.emails.send({
          from: "ValidaPlay <noreply@validaplay.com.br>",
          to: "contato@validaplay.com.br",
          subject: assuntoAdmin,
          html: mensagemAdmin,
        });

        return res.status(200).json({success: true});
      } catch (error) {
        console.error("Erro enviarEmail:", error);
        return res.status(500).json({error: "Erro ao enviar email"});
      }
    },
);


// ==================================================
// 2️⃣ TESTADOR APROVADO (BLINDADO CONTRA DUPLICAÇÃO)
// ==================================================
exports.onTestadorAprovado = onDocumentUpdated(
    {
      document: "testadores/{id}",
      secrets: [resendApiKey],
    },
    async (event) => {
      let before = null;
      let after = null;

      if (event.data.before) {
        before = event.data.before.data();
      }

      if (event.data.after) {
        after = event.data.after.data();
      }


      if (!before || !after) return;

      // 🔒 só dispara quando muda de pendente → aprovado
      if (before.status !== "pendente") return;
      if (after.status !== "aprovado") return;

      if (!resend) {
        resend = new Resend(resendApiKey.value());
      }

      await resend.emails.send({
        from: "ValidaPlay <contato@validaplay.com.br>",
        to: after.email,
        subject: "Você foi aprovado na ValidaPlay 🎉",
        html: `
<h2>Você foi aprovado na ValidaPlay 🎉</h2>

<p>Olá ${after.nome},</p>

<p>
Seu cadastro foi aprovado com sucesso e você agora faz parte da nossa base oficial de testadores.
</p>

<p>
Em breve você poderá receber convites para participar de validações reais de aplicativos.
</p>

<p>
Fique atento às comunicações por email e WhatsApp.
</p>

<br>

<p>
Parabéns e seja bem-vindo(a)!<br>
<strong>Equipe ValidaPlay</strong>
</p>
`,
      });

      console.log("Email testador aprovado:", after.email);
    },
);


// ==================================================
// 3️⃣ CLIENTE APROVADO (BLINDADO)
// ==================================================
exports.onClienteAprovado = onDocumentUpdated(
    {
      document: "solicitacoes/{id}",
      secrets: [resendApiKey],
    },
    async (event) => {
      let before = null;
      let after = null;

      if (event.data.before) {
        before = event.data.before.data();
      }

      if (event.data.after) {
        after = event.data.after.data();
      }


      if (!before || !after) return;

      // 🔒 evita disparos duplicados
      if (before.status !== "pendente") return;
      if (after.status !== "aprovado") return;

      if (!resend) {
        resend = new Resend(resendApiKey.value());
      }

      await resend.emails.send({
        from: "ValidaPlay <contato@validaplay.com.br>",
        to: after.email || after.emailCliente,
        subject: "Seu aplicativo foi aprovado na ValidaPlay 🚀",
        html: `
<h2>Seu aplicativo foi aprovado 🚀</h2>

<p>Olá,</p>

<p>
O aplicativo <strong>${after.nomeApp}</strong> foi aprovado na <strong>ValidaPlay</strong>.
</p>

<p><strong>Próximos passos:</strong></p>

<ul>
  <li>Organização dos testadores</li>
  <li>Início do período oficial de validação</li>
  <li>Acompanhamento contínuo durante os 14 dias</li>
</ul>

<p>
Nossa equipe entrará em contato para alinhar os detalhes finais.
</p>

<br>

<p>
Atenciosamente,<br>
<strong>Equipe ValidaPlay</strong>
</p>
`,
      });

      console.log("Email cliente aprovado:", after.email);
    },
);
