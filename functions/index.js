const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {Resend} = require("resend");

setGlobalOptions({maxInstances: 10});

// Secret já criado anteriormente
const resendApiKey = defineSecret("RESEND_API_KEY");

exports.enviarEmail = onRequest(
    {secrets: [resendApiKey]},
    async (req, res) => {
      try {
        const {email, nome} = req.body;

        if (!email || !nome) {
          return res.status(400).send("Dados inválidos");
        }

        const resend = new Resend(resendApiKey.value());

        await resend.emails.send({
          from: "ValidaPlay <noreply@validaplay.com.br>",
          to: email,
          subject: "Cadastro recebido 🎉",
          html: `
          <h2>Olá ${nome}!</h2>
          <p>Recebemos seu cadastro como testador na ValidaPlay.</p>
          <p>Em breve entraremos em contato com você.</p>
          <br/>
          <p><strong>Equipe ValidaPlay</strong></p>
        `,
        });

        res.status(200).send("Email enviado com sucesso");
      } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao enviar email");
      }
    },
);
