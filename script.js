/* ================= PRODUTOS ================= */

    // (A conexão com o Supabase agora vem de supabase-config.js,
    // carregado antes deste arquivo no index.html)


    // Emoji de placeholder por categoria (até termos fotos reais)
    const CATEGORY_EMOJI = {
        botas: "👢",
        roupas: "👕",
        chapeus: "🤠",
        acessorios: "🤎"
    };


    async function loadProducts() {

        const grid = document.getElementById("productsGrid");

        const { data: produtos, error } = await supabaseClient
            .from("produtos")
            .select("*")
            .order("criado_em");

        if (error) {

            console.error("Erro ao buscar produtos:", error);

            grid.innerHTML = `
                <p style="color:#e55;text-align:center;grid-column:1/-1;padding:50px 0">
                    Não foi possível carregar os produtos. Tente novamente mais tarde.
                </p>
            `;

            return;

        }

        if (!produtos || produtos.length === 0) {

            grid.innerHTML = `
                <p style="color:#666;text-align:center;grid-column:1/-1;padding:50px 0">
                    Nenhum produto disponível no momento.
                </p>
            `;

            return;

        }

        grid.innerHTML = produtos.map(renderProductCard).join("");

    }


    function renderProductCard(produto) {

        const emoji = CATEGORY_EMOJI[produto.categoria] || "🛍️";

        const precoFormatado =
            produto.preco.toFixed(2).replace(".", ",");

        const precoAntigoHtml =
            produto.preco_antigo
                ? `<span class="old-price">R$ ${produto.preco_antigo.toFixed(2).replace(".", ",")}</span>`
                : "";

        const badgeHtml =
            produto.badge
                ? `<span class="badge">${produto.badge}</span>`
                : "";

        const esgotado = produto.estoque <= 0;

        return `
            <article
                class="product"
                data-category="${produto.categoria}"
                data-name="${produto.nome}"
            >
                <div class="product-image">
                    <div class="product-placeholder">${emoji}</div>
                    ${badgeHtml}
                    <button class="favorite" onclick="favorite(this)">♡</button>
                </div>

                <div class="product-info">
                    <span class="product-category">${produto.categoria}</span>
                    <h3>${produto.nome}</h3>
                    <div class="rating">★★★★★</div>
                    <div class="price">
                        R$ ${precoFormatado}
                        ${precoAntigoHtml}
                    </div>
                    <button
                        class="add-cart"
                        onclick="addToCart('${produto.id}', '${produto.nome}', ${produto.preco})"
                        ${esgotado ? "disabled style=\"opacity:.4;cursor:not-allowed\"" : ""}
                    >
                        ${esgotado ? "Esgotado" : "Adicionar ao carrinho"}
                    </button>
                </div>
            </article>
        `;

    }


/* ================= CARRINHO ================= */

    let cart = [];


    function addToCart(id, name, price) {

        const existing = cart.find(
            item => item.id === id
        );

        if (existing) {

            existing.quantity++;

        } else {

            cart.push({
                id: id,
                name: name,
                price: price,
                quantity: 1
            });

        }

        updateCart();

        openCart();

    }


    function updateCart() {

        const container =
            document.getElementById("cartItems");

        const count =
            document.getElementById("cart-count");

        const totalElement =
            document.getElementById("cartTotal");


        let total = 0;
        let quantity = 0;


        if (cart.length === 0) {

            container.innerHTML = `
                <p style="
                    color:#666;
                    text-align:center;
                    padding:50px 0
                ">
                    Seu carrinho está vazio.
                </p>
            `;

        } else {

            container.innerHTML = cart.map(
                (item, index) => {

                    total += item.price * item.quantity;

                    quantity += item.quantity;

                    return `
                        <div class="cart-item">

                            <div class="cart-item-image">
                                🛍️
                            </div>

                            <div class="cart-item-info">

                                <h4>
                                    ${item.name}
                                </h4>

                                <p>
                                    ${item.quantity}x
                                    R$ ${item.price
                                        .toFixed(2)
                                        .replace(".", ",")}
                                </p>

                            </div>

                            <button
                                class="remove-item"
                                onclick="removeItem(${index})"
                            >
                                ✕
                            </button>

                        </div>
                    `;

                }
            ).join("");

        }


        count.textContent = quantity;

        totalElement.textContent =
            "R$ " +
            total.toFixed(2).replace(".", ",");

    }


    function removeItem(index) {

        cart.splice(index, 1);

        updateCart();

    }


    function openCart() {

        document
            .getElementById("cartOverlay")
            .classList.add("active");

        document.body.style.overflow = "hidden";

    }


    function closeCart() {

        document
            .getElementById("cartOverlay")
            .classList.remove("active");

        document.body.style.overflow = "";

    }


    function closeCartOutside(event) {

        if (
            event.target.id === "cartOverlay"
        ) {

            closeCart();

        }

    }


    /* ================= WHATSAPP ================= */

    async function checkoutWhatsApp() {

        if (cart.length === 0) {

            alert("Seu carrinho está vazio!");

            return;

        }


        // Abate o estoque de cada item no banco antes de finalizar o pedido
        const baixasDeEstoque = cart.map(item =>
            supabaseClient.rpc("decrementar_estoque", {
                produto_id: item.id,
                quantidade: item.quantity
            })
        );

        const resultados = await Promise.all(baixasDeEstoque);

        const algumErro = resultados.some(r => r.error);

        if (algumErro) {

            console.error("Erro ao abater estoque:", resultados);

            alert(
                "Não foi possível confirmar o pedido agora. Tente novamente."
            );

            return;

        }


        let message =
            "Olá! Quero fazer um pedido na JK Botinas:%0A%0A";


        cart.forEach(item => {

            message +=
                `• ${item.name} - ${item.quantity}x - R$ ${
                    (item.price * item.quantity)
                    .toFixed(2)
                    .replace(".", ",")
                }%0A`;

        });


        const total =
            cart.reduce(
                (sum, item) =>
                    sum + item.price * item.quantity,
                0
            );


        message +=
            `%0A*Total: R$ ${
                total.toFixed(2).replace(".", ",")
            }*`;


        /*
            TROQUE PELO NÚMERO DO WHATSAPP DA LOJA.

            Exemplo:
            5511999999999
        */

        const phone =
            "5500000000000";


        window.open(
            `https://wa.me/${phone}?text=${message}`,
            "_blank"
        );


        // Esvazia o carrinho e recarrega os produtos
        // (pra já mostrar "Esgotado" se algum zerou)
        cart = [];

        updateCart();

        closeCart();

        loadProducts();

    }


    /* ================= FAVORITOS ================= */

    function favorite(button) {

        button.classList.toggle("active");

        if (
            button.classList.contains("active")
        ) {

            button.innerHTML = "♥";

        } else {

            button.innerHTML = "♡";

        }

    }


    /* ================= FILTROS ================= */

    function filterCategory(category) {

        const products =
            document.querySelectorAll(".product");

        const buttons =
            document.querySelectorAll(".filter-btn");


        buttons.forEach(button => {

            button.classList.remove("active");

            if (
                button.textContent
                    .toLowerCase()
                    .includes(
                        category === "todos"
                            ? "todos"
                            : category === "chapeus"
                                ? "chapéus"
                                : category
                    )
            ) {

                button.classList.add("active");

            }

        });


        products.forEach(product => {

            if (
                category === "todos" ||
                product.dataset.category === category
            ) {

                product.style.display = "";

            } else {

                product.style.display = "none";

            }

        });


        document
            .getElementById("produtos")
            .scrollIntoView({
                behavior: "smooth"
            });

    }


    /* ================= BUSCA ================= */

    function searchProducts() {

        const search =
            document
                .getElementById("search")
                .value
                .toLowerCase();


        const products =
            document.querySelectorAll(".product");


        products.forEach(product => {

            const name =
                product.dataset.name.toLowerCase();


            if (name.includes(search)) {

                product.style.display = "";

            } else {

                product.style.display = "none";

            }

        });

    }


    function focusSearch() {

        document
            .getElementById("produtos")
            .scrollIntoView({
                behavior: "smooth"
            });


        setTimeout(() => {

            document
                .getElementById("search")
                .focus();

        }, 600);

    }


    /* ================= MENU MOBILE ================= */

    function toggleMobileMenu() {

        const nav =
            document.querySelector("nav");


        if (
            nav.style.display === "flex"
        ) {

            nav.style.display = "";

        } else {

            nav.style.display = "flex";

            nav.style.position = "absolute";
            nav.style.top = "85px";
            nav.style.left = "0";
            nav.style.width = "100%";
            nav.style.padding = "25px";
            nav.style.background = "#080808";
            nav.style.flexDirection = "column";
            nav.style.borderBottom =
                "1px solid #392b12";

        }

    }


    /* ================= INICIALIZAÇÃO ================= */

    updateCart();
    loadProducts();