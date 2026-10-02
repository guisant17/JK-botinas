/* A interface só libera a loja após autenticação e cadastro. O banco aplica RLS. */
(function () {
    'use strict';
    let customer = null;
    let currentUser = null;
    let revision = 0;
    let recovery = new URLSearchParams(location.search).get('recovery') === '1';
    let busy = false;
    const el = id => document.getElementById(id);
    const client = typeof supabaseClient !== 'undefined' ? supabaseClient : null;
    const baseURL = () => new URL('index.html', location.href).href.split('?')[0].split('#')[0];
    const forms = ['login', 'register', 'reset', 'password', 'profile'];
    function message(text = '', isError = false) {
        el('authMessage').textContent = text;
        el('authMessage').dataset.error = String(isError);
    }
    function show(view) {
        el('authLoading').hidden = true;
        el('authContent').hidden = false;
        el('authScreen').hidden = false;
        el('storefront').hidden = true;
        for (const form of forms) el(form + 'Form').hidden = form !== view;
        el('authTabs').hidden = !['login', 'register'].includes(view);
        el('showLogin').setAttribute('aria-pressed', String(view === 'login'));
        el('showRegister').setAttribute('aria-pressed', String(view === 'register'));
        const texts = {
            login: ['Bem-vindo à JK Botinas', 'Entre na sua conta para acessar a loja.'],
            register: ['Crie sua conta', 'Primeiro, crie e confirme seu acesso por e-mail.'],
            reset: ['Recuperar senha', 'Enviaremos um link para você criar uma nova senha.'],
            password: ['Escolha uma nova senha', 'Use pelo menos 8 caracteres.'],
            profile: ['Complete seu cadastro', 'Só falta informar seus dados para entrar na loja.']
        };
        el('authTitle').textContent = texts[view][0];
        el('authIntro').textContent = texts[view][1];
        message();
    }
    function lock() {
        const oldId = customer?.id;
        customer = null;
        currentUser = null;
        el('storefront').hidden = true;
        el('authScreen').hidden = false;
        for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
        document.body.style.overflow = '';
        el('profileForm').reset();
        el('profileEmail').value = '';
        window.dispatchEvent(new CustomEvent('jk:locked', {detail: {oldId}}));
    }
    function humanError(error) {
        const code = error?.code;
        if (code === 'invalid_credentials') return 'E-mail ou senha incorretos.';
        if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.';
        if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
        if (code === 'weak_password') return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
        if (code === '23505') return 'Não foi possível salvar estes dados. Verifique seu cadastro ou fale com a loja.';
        if (code === 'PGRST202' || code === '42P01' || code === 'PGRST205') return 'O cadastro está temporariamente indisponível. A loja precisa concluir a configuração do sistema.';
        return 'Não foi possível concluir agora. Confira sua conexão e tente novamente.';
    }
    async function refresh() {
        const request = ++revision;
        if (!client) { lock(); show('login'); message('Não foi possível carregar o acesso à loja. Recarregue a página e confira sua conexão.', true); return; }
        try {
            const {data: sessionData, error: sessionError} = await client.auth.getSession();
            if (request !== revision) return;
            if (sessionError) throw sessionError;
            if (!sessionData.session) { lock(); show('login'); if (recovery) message('Abra o link de recuperação enviado ao seu e-mail.', true); return; }
            const {data, error} = await client.auth.getUser();
            if (request !== revision) return;
            if (error || !data.user) throw error || new Error('Sessão indisponível');
            currentUser = data.user;
            if (!currentUser.email_confirmed_at) { lock(); show('login'); message('Confirme seu e-mail para acessar a loja.', true); return; }
            if (recovery) { customer = null; show('password'); return; }
            const result = await client.from('jk_clientes').select('id,nome,cpf,telefone').eq('id', currentUser.id).maybeSingle();
            if (request !== revision) return;
            if (result.error) throw result.error;
            if (!result.data) {
                customer = null;
                show('profile');
                el('profileEmail').value = currentUser.email || '';
                return;
            }
            JKUtils.validateProfile(result.data);
            const changed = customer?.id !== result.data.id;
            customer = {...result.data, email: currentUser.email};
            el('authLoading').hidden = true;
            el('authScreen').hidden = true;
            el('storefront').hidden = false;
            for (const form of ['login', 'register', 'reset', 'password', 'profile']) el(form + 'Form').reset();
            window.dispatchEvent(new CustomEvent('jk:ready', {detail: {customerId: customer.id, changed}}));
        } catch (error) {
            if (request !== revision) return;
            lock(); show('login'); message(humanError(error), true);
        }
    }
    async function run(form, action) {
        if (busy || !form.reportValidity()) return;
        busy = true;
        const button = form.querySelector('[type="submit"]');
        const label = button.textContent;
        button.disabled = true;
        button.textContent = 'Aguarde…';
        message();
        try { if (!client) throw new Error('Configuração indisponível'); await action(Object.fromEntries(new FormData(form))); }
        catch (error) { message(error.local ? error.message : humanError(error), true); }
        finally { busy = false; button.disabled = false; button.textContent = label; }
    }
    function localError(text) { const error = new Error(text); error.local = true; throw error; }
    function passwords(input) { if (input.password.length < 8 || input.password !== input.confirmPassword) localError('As senhas devem ser iguais e ter pelo menos 8 caracteres.'); }
    for (const [button, view] of [['showLogin','login'], ['showRegister','register'], ['showReset','reset']]) el(button).addEventListener('click', () => show(view));
    document.querySelectorAll('[data-auth-back]').forEach(button => button.addEventListener('click', () => show('login')));
    el('loginForm').addEventListener('submit', event => {
        event.preventDefault();
        run(event.currentTarget, async input => {
            const {error} = await client.auth.signInWithPassword({email: input.email.trim(), password: input.password});
            if (error) throw error;
            el('loginForm').reset();
            await refresh();
        });
    });
    el('registerForm').addEventListener('submit', event => {
        event.preventDefault();
        run(event.currentTarget, async input => {
            passwords(input);
            const {data, error} = await client.auth.signUp({email: input.email.trim(), password: input.password, options: {emailRedirectTo: baseURL()}});
            if (error) throw error;
            el('registerForm').reset();
            if (data.session) await refresh();
            else { show('login'); message('Verifique seu e-mail para confirmar o cadastro. Depois entre para informar nome, CPF e telefone. Se já possui uma conta, use sua senha ou recupere o acesso.'); }
        });
    });
    el('resetForm').addEventListener('submit', event => {
        event.preventDefault();
        run(event.currentTarget, async input => {
            const {error} = await client.auth.resetPasswordForEmail(input.email.trim(), {redirectTo: baseURL() + '?recovery=1'});
            if (error) throw error;
            message('Se houver uma conta para este e-mail, você receberá o link de recuperação. Verifique também a pasta de spam.');
        });
    });
    el('passwordForm').addEventListener('submit', event => {
        event.preventDefault();
        run(event.currentTarget, async input => {
            passwords(input);
            const {error} = await client.auth.updateUser({password: input.password});
            if (error) throw error;
            recovery = false;
            history.replaceState(null, '', baseURL());
            el('passwordForm').reset();
            await refresh();
        });
    });
    el('profileForm').addEventListener('submit', event => {
        event.preventDefault();
        run(event.currentTarget, async input => {
            let profile;
            try { profile = JKUtils.validateProfile(input); } catch (error) { localError(error.message); }
            const {error} = await client.rpc('jk_salvar_cliente', {p_nome: profile.nome, p_cpf: profile.cpf, p_telefone: profile.telefone});
            if (error) throw error;
            await refresh();
        });
    });
    async function logout() {
        ++revision;
        lock(); show('login');
        try {
            const {error} = await client.auth.signOut({scope: 'local'});
            if (error) throw error;
            message('Você saiu da sua conta.');
        } catch (error) { message('Não foi possível encerrar a sessão. Confira sua conexão e tente sair novamente.', true); }
    }
    el('profileLogout').addEventListener('click', logout);
    el('customerLogoutButton').addEventListener('click', logout);
    window.JKAuth = {
        get customer() { return customer; },
        refresh, logout,
        async requireCustomer() {
            await refresh();
            if (!customer) throw new Error('Entre e complete seu cadastro para continuar.');
            return customer;
        }
    };
    if (client) client.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') recovery = true;
        if (event === 'SIGNED_OUT') { ++revision; lock(); show('login'); }
        else if (event !== 'INITIAL_SESSION') setTimeout(() => { if (!busy) refresh(); }, 0);
    });
    // Mostra o formulário imediatamente enquanto a sessão é verificada.
    // Isso evita uma tela vazia quando a rede ou o Supabase demora para responder.
    show('login');
    window.JKAuth.ready = refresh();

    // Recuperação visual para erros de carregamento inesperados.
    setTimeout(() => {
        const authScreen = el('authScreen');
        const storefront = el('storefront');
        if (!customer && authScreen.hidden && storefront.hidden) {
            authScreen.hidden = false;
            show('login');
            message('Não foi possível carregar a loja. Atualize a página e tente novamente.', true);
        }
    }, 8000);
})();
