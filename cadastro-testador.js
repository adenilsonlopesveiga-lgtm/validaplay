import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const btn = document.getElementById("btnCadastrar");

btn.addEventListener("click", async () => {

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const tipoCelular = document.getElementById("tipoCelular").value;
    const modelo = document.getElementById("modelo").value.trim();
    const versao = document.getElementById("versao").value.trim();

    if (!nome || !email) {
        alert("Preencha nome e email.");
        return;
    }

    // 🔒 validação básica de email
    if (!email.includes("@")) {
        alert("Email inválido.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Cadastrando...";

    try {

        // 🔥 1. Salvar no Firestore
        await addDoc(collection(db, "testadores"), {
            nome,
            email,
            whatsapp,
            tipoCelular,
            modelo,
            versao,
            status: "pendente",

            criadoEm: serverTimestamp()
        });

        // 📩 2. Enviar email via Cloud Function
        const response = await fetch("https://us-central1-validaplay.cloudfunctions.net/enviarEmail", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nome,
                email,
                whatsapp,
                tipoCelular,
                modelo,
                versao
            })
        });

        if (!response.ok) {
            throw new Error("Erro ao enviar email");
        }

        // ✅ Redirecionar
        document.querySelector(".container").innerHTML = `
  <h1>Cadastro realizado com sucesso 🎉</h1>
  <p>Em breve entraremos em contato com você.</p>
`;


    } catch (error) {
        console.error("Erro:", error);
        alert("Erro ao cadastrar. Tente novamente.");
        btn.disabled = false;
        btn.innerText = "Cadastrar";
    }

});
