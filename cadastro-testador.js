import { db, auth } from "./firebase.js";

import { 
  collection,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";





const btn = document.getElementById("btnCadastrar");

btn.addEventListener("click", async () => {

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const tipoCelular = document.getElementById("tipoCelular").value;
    const modelo = document.getElementById("modelo").value.trim();
    const versao = document.getElementById("versao").value.trim();

    if (!nome || !email || !senha) {
        alert("Preencha nome, email e senha.");
        return;
    }

    if (!email.includes("@")) {
        alert("Email inválido.");
        return;
    }

    if (senha.length < 6) {
        alert("A senha deve ter pelo menos 6 caracteres.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Cadastrando...";

    try {

        // 🔐 1 — CRIAR CONTA NO AUTH
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // 🔥 2 — SALVAR PERFIL COM UID COMO ID
        await setDoc(doc(db, "testadores", user.uid), {
            nome,
            email,
            whatsapp,
            tipoCelular,
            modelo,
            versao,
            status: "pendente",
            criadoEm: serverTimestamp()
        });

        // 📩 3 — ENVIA EMAIL (mantido)
        const resposta = await fetch(
            "https://us-central1-validaplay.cloudfunctions.net/enviarEmail",
            {
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
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.success) {
            throw new Error("Falha ao enviar email");
        }

        // ✅ SUCESSO
        document.querySelector(".container").innerHTML = `
            <h1>Cadastro realizado com sucesso 🎉</h1>
            <p>Aguarde aprovação do administrador para acessar o painel.</p>
        `;

    } catch (error) {

        console.error("ERRO REAL:", error);

        alert("Erro ao criar conta. Verifique se o email já não está em uso.");

        btn.disabled = false;
        btn.innerText = "Cadastrar";
    }

});
