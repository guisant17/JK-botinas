/* ================= LOGIN ================= */

    async function fazerLogin() {

        const email =
            document.getElementById("loginEmail").value;

        const senha =
            document.getElementById("loginPassword").value;

        const errorBox =
            document.getElementById("loginError");

        errorBox.textContent = "";

        const { error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: senha
            });

        if (error) {

            errorBox.textContent =
                "E-mail ou senha incorretos.";

            return;

        }

        mostrarPainel();

    }


    async function fazerLogout() {

        await supabaseClient.auth.signOut();

        document.getElementById("adminPanel").style.display = "none";

        document.getElementById("loginScreen").style.display = "flex";

        document.getElementById("loginEmail").value = "";

        document.getElementById("loginPassword").value = "";

    }


    function mostrarPainel() {

        document.getElementById("loginScreen").style.display = "none";

        document.getElementById("adminPanel").style.display = "block";

        carregarProdutosAdmin();

    }


    /* ================= LISTAGEM ================= */

    async function carregarProdutosAdmin() {

        const tbody =
            document.getElementById("adminTableBody");

        const { data: produtos, error } = await supabaseClient
            .from("produtos")
            .select("*")
            .order("criado_em");

        if (error) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="color:#e55">
                        Erro ao carregar produtos.
                    </td>
                </tr>
            `;

            return;

        }

        tbody.innerHTML = produtos.map(produto => `
            <tr>
                <td>${produto.nome}</td>
                <td>${produto.categoria}</td>
                <td>R$ ${produto.preco.toFixed(2).replace(".", ",")}</td>
                <td>
                    <input
                        type="number"
                        min="0"
                        class="admin-stock-input"
                        id="estoque-${produto.id}"
                        value="${produto.estoque}"
                    >
                </td>
                <td>
                    <button
                        class="btn admin-save-btn"
                        id="btn-${produto.id}"
                        onclick="salvarEstoque('${produto.id}')"
                    >
                        Salvar
                    </button>
                </td>
            </tr>
        `).join("");

    }


    /* ================= SALVAR ESTOQUE ================= */

    async function salvarEstoque(id) {

        const input =
            document.getElementById(`estoque-${id}`);

        const botao =
            document.getElementById(`btn-${id}`);

        const novoValor =
            parseInt(input.value, 10);

        if (isNaN(novoValor) || novoValor < 0) {

            alert("Digite uma quantidade válida.");

            return;

        }

        botao.textContent = "Salvando...";

        const { error } = await supabaseClient
            .from("produtos")
            .update({ estoque: novoValor })
            .eq("id", id);

        if (error) {

            botao.textContent = "Erro!";

            console.error(error);

            return;

        }

        botao.textContent = "Salvo!";

        setTimeout(() => {

            botao.textContent = "Salvar";

        }, 1500);

    }


    /* ================= INICIALIZAÇÃO ================= */

    async function initAdmin() {

        const { data: { session } } =
            await supabaseClient.auth.getSession();

        if (session) {

            mostrarPainel();

        } else {

            document.getElementById("loginScreen").style.display = "flex";

        }

    }

    initAdmin();


    /* ================= CADASTRAR PRODUTO ================= */

async function cadastrarProduto(event) {
    event.preventDefault();

    const msg = document.getElementById("msgCadastro");
    msg.style.color = "#aaa";
    msg.textContent = "Cadastrando...";

    const nome = document.getElementById("novoNome").value;
    const categoria = document.getElementById("novaCategoria").value;
    const preco = parseFloat(document.getElementById("novoPreco").value);
    const estoque = parseInt(document.getElementById("novoEstoque").value, 10);
    const imagem_url = document.getElementById("novaImagem").value || null;

    const { error } = await supabaseClient
        .from("produtos")
        .insert([
            {
                nome: nome,
                categoria: categoria,
                preco: preco,
                estoque: estoque,
                imagem_url: imagem_url
            }
        ]);

    if (error) {
        console.error("Erro ao cadastrar:", error);
        msg.style.color = "#e55";
        msg.textContent = "Erro ao cadastrar produto. Verifique as permissões.";
        return;
    }

    msg.style.color = "#5e5";
    msg.textContent = "Produto cadastrado com sucesso!";
    document.getElementById("formNovoProduto").reset();

    // Recarrega a tabela de produtos
    carregarProdutosAdmin();
}