const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");

setGlobalOptions({maxInstances: 10});

const resendApiKey = defineSecret("RESEND_API_KEY");

exports.enviarEmail = onRequest(
    {
      secrets: [resendApiKey],
      cors: true, // já resolve CORS no v2
    },
    async (req, res) => {
    // 🔹 Responde corretamente ao preflight
      if (req.method === "OPTIONS") {
        return res.status(204).send("");
      }

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
        } = req.body || {};

        if (!email || !nome) {
          return res.status(400).send("Dados inválidos");
        }

        const resend = new Resend(resendApiKey.value());

        // 📧 Email para o usuário
        await resend.emails.send({
          from: "ValidaPlay <noreply@validaplay.com.br>",
          to: email,
          subject: "Cadastro recebido 🎉",
          html: `
          <h2>Olá ${nome}!</h2>
          <p>Recebemos seu cadastro como testador na ValidaPlay.</p>
          <p>Em breve entraremos em contato com você.</p>
        `,
        });

        // 📧 Email para você (admin)
        await resend.emails.send({
          from: "ValidaPlay <noreply@validaplay.com.br>",
          to: "seuemail@validaplay.com.br", // coloque seu email real aqui
          subject: "Novo testador cadastrado 🚀",
          html: `
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>WhatsApp:</strong> ${whatsapp || "-"}</p>
          <p><strong>Celular:</strong> ${tipoCelular || "-"}</p>
          <p><strong>Modelo:</strong> ${modelo || "-"}</p>
          <p><strong>Versão:</strong> ${versao || "-"}</p>
        `,
        });

        return res.status(200).json({success: true});
      } catch (error) {
        console.error("Erro enviarEmail:", error);
        return res.status(500).json({error: "Erro ao enviar email"});
      }
    },
);
