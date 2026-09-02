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

    // Guarda os produtos carregados (id -> produto), usado pelo
    // botão "Editar" pra preencher o formulário sem precisar
    // buscar de novo no banco
    let produtosCache = {};


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
                    <td colspan="6" style="color:#e55">
                        Erro ao carregar produtos.
                    </td>
                </tr>
            `;

            return;

        }

        produtosCache = {};

        produtos.forEach(produto => {

            produtosCache[produto.id] = produto;

        });

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
                <td class="admin-actions">
                    <button
                        class="btn btn-outline admin-edit-btn"
                        onclick="editarProduto('${produto.id}')"
                    >
                        Editar
                    </button>
                    <button
                        class="btn admin-delete-btn"
                        onclick="excluirProduto('${produto.id}')"
                    >
                        Excluir
                    </button>
                </td>
            </tr>
        `).join("");

    }


    /* ================= SALVAR ESTOQUE (edição rápida) ================= */

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

        // Mantém o cache local atualizado também
        if (produtosCache[id]) {

            produtosCache[id].estoque = novoValor;

        }

        setTimeout(() => {

            botao.textContent = "Salvar";

        }, 1500);

    }


    /* ================= ADICIONAR / EDITAR PRODUTO ================= */

    function editarProduto(id) {

        const produto = produtosCache[id];

        if (!produto) {

            return;

        }

        document.getElementById("prodId").value = produto.id;

        document.getElementById("prodImagemAtual").value =
            produto.imagem_url || "";

        document.getElementById("prodNome").value = produto.nome;

        document.getElementById("prodCategoria").value = produto.categoria;

        document.getElementById("prodPreco").value = produto.preco;

        document.getElementById("prodPrecoAntigo").value =
            produto.preco_antigo || "";

        document.getElementById("prodBadge").value = produto.badge || "";

        document.getElementById("prodEstoque").value = produto.estoque;

        document.getElementById("prodFoto").value = "";

        document.getElementById("formTitulo").textContent =
            "Editar produto";

        document.getElementById("btnSalvarProduto").textContent =
            "Salvar alterações";

        document.getElementById("btnCancelarEdicao").style.display = "";

        document
            .getElementById("productForm")
            .scrollIntoView({ behavior: "smooth" });

    }


    function cancelarEdicao() {

        document.getElementById("productFormEl").reset();

        document.getElementById("prodId").value = "";

        document.getElementById("prodImagemAtual").value = "";

        document.getElementById("formTitulo").textContent =
            "Adicionar novo produto";

        document.getElementById("btnSalvarProduto").textContent =
            "Adicionar produto";

        document.getElementById("btnCancelarEdicao").style.display = "none";

    }


    async function salvarProduto(event) {

        event.preventDefault();

        const id = document.getElementById("prodId").value;

        const nome = document.getElementById("prodNome").value.trim();

        const categoria = document.getElementById("prodCategoria").value;

        const preco = parseFloat(document.getElementById("prodPreco").value);

        const precoAntigoRaw =
            document.getElementById("prodPrecoAntigo").value;

        const precoAntigo = precoAntigoRaw ? parseFloat(precoAntigoRaw) : null;

        const badge = document.getElementById("prodBadge").value || null;

        const estoque = parseInt(document.getElementById("prodEstoque").value, 10);

        const arquivoFoto = document.getElementById("prodFoto").files[0];

        if (!nome || !categoria || isNaN(preco) || isNaN(estoque)) {

            alert("Preencha nome, categoria, preço e estoque.");

            return;

        }

        const botaoSalvar = document.getElementById("btnSalvarProduto");

        const textoOriginalBotao = botaoSalvar.textContent;

        botaoSalvar.disabled = true;

        botaoSalvar.textContent = "Salvando...";


        // Começa com a imagem que já existia (caso esteja editando
        // e não tenha escolhido uma foto nova)
        let imagemUrl =
            document.getElementById("prodImagemAtual").value || null;


        if (arquivoFoto) {

            botaoSalvar.textContent = "Enviando foto...";

            const nomeArquivo =
                `${Date.now()}-${arquivoFoto.name.replace(/[^a-zA-Z0-9.\-]/g, "_")}`;

            const { error: erroUpload } = await supabaseClient
                .storage
                .from("produtos-fotos")
                .upload(nomeArquivo, arquivoFoto);

            if (erroUpload) {

                alert("Erro ao enviar a foto: " + erroUpload.message);

                botaoSalvar.disabled = false;

                botaoSalvar.textContent = textoOriginalBotao;

                return;

            }

            const { data: urlData } = supabaseClient
                .storage
                .from("produtos-fotos")
                .getPublicUrl(nomeArquivo);

            imagemUrl = urlData.publicUrl;

            botaoSalvar.textContent = "Salvando...";

        }


        const dadosProduto = {

            nome: nome,
            categoria: categoria,
            preco: preco,
            preco_antigo: precoAntigo,
            badge: badge,
            estoque: estoque,
            imagem_url: imagemUrl

        };


        let erroSalvar;

        if (id) {

            const { error } = await supabaseClient
                .from("produtos")
                .update(dadosProduto)
                .eq("id", id);

            erroSalvar = error;

        } else {

            const { error } = await supabaseClient
                .from("produtos")
                .insert(dadosProduto);

            erroSalvar = error;

        }


        botaoSalvar.disabled = false;

        if (erroSalvar) {

            alert("Erro ao salvar produto: " + erroSalvar.message);

            botaoSalvar.textContent = textoOriginalBotao;

            return;

        }

        cancelarEdicao();

        carregarProdutosAdmin();

    }


    /* ================= EXCLUIR PRODUTO ================= */

    async function excluirProduto(id) {

        const produto = produtosCache[id];

        const nomeProduto = produto ? produto.nome : "este produto";

        const confirmar = confirm(
            `Tem certeza que quer excluir "${nomeProduto}"? Essa ação não pode ser desfeita.`
        );

        if (!confirmar) {

            return;

        }

        const { error } = await supabaseClient
            .from("produtos")
            .delete()
            .eq("id", id);

        if (error) {

            alert("Erro ao excluir: " + error.message);

            return;

        }

        carregarProdutosAdmin();

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