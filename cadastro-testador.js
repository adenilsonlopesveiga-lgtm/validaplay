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
            criadoEm: serverTimestamp()
        });

        // 📩 2. Chamar Cloud Function para enviar email
        const response = await fetch("https://us-central1-validaplay.cloudfunctions.net/enviarEmail", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        nome,
        email
    })
});

if (!response.ok) {
    throw new Error("Erro ao enviar email");
}


        alert("Cadastro realizado com sucesso!");
        window.location.href = "obrigado.html";

    } catch (error) {
        console.error(error);
        alert("Erro ao cadastrar. Tente novamente.");
    }

    btn.disabled = false;
    btn.innerText = "Cadastrar";

});
