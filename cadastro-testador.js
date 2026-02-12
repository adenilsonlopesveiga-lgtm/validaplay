import { db } from "./firebase.js";
import { collection, addDoc, serverTimestamp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const form = document.querySelector("form");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = document.querySelector("#nome").value;
  const email = document.querySelector("#email").value;
  const celular = document.querySelector("#celular").value;
  const cidade = document.querySelector("#cidade").value;
  const estado = document.querySelector("#estado").value;

  try {

    await addDoc(collection(window.db, "testadores"), {
      nome,
      email,
      celular,
      cidade,
      estado,
      status: "disponivel",
      criadoEm: serverTimestamp()
    });

    alert("Cadastro realizado! Você será avisado quando houver um teste disponível.");

    form.reset();

  } catch (error) {
    alert("Erro ao cadastrar. Tente novamente.");
    console.error(error);
  }
});
