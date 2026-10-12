# Inventário de PCs — versão compartilhada

Aplicação web responsiva para inventário por seção, com banco de dados central, sincronização em tempo real e histórico de alterações. O site pode ser publicado no GitHub Pages; os dados ficam no Supabase, e não no armazenamento local de cada navegador.

## O que mudou

- **Banco compartilhado:** PCs e seções ficam no mesmo banco Supabase para todos os usuários autenticados.
- **Sincronização ao vivo:** alterações feitas por um usuário são enviadas aos demais dispositivos conectados.
- **Aba “Atualizações”:** exibe inclusões, edições e exclusões, data/hora, seção, PC, campos alterados e e-mail do usuário.
- **Login:** cada pessoa acessa com uma conta criada pelo administrador.
- **Histórico no banco:** o registro de alterações é criado por gatilhos SQL, e não apenas pelo navegador.
- Mantém cadastro, edição, exclusão, pesquisa, boletim, impressão/PDF, compartilhamento e backup JSON.
- A base inicial do inventário original (33 computadores e 5 seções) está incluída no script SQL.

## 1. Criar o banco compartilhado

1. Acesse <https://supabase.com/dashboard> e crie um projeto Supabase.
2. No projeto, abra **SQL Editor → New query**.
3. Abra o arquivo `supabase-setup.sql` desta pasta, copie todo o conteúdo e execute no SQL Editor. Execute uma vez, antes de os usuários começarem a cadastrar dados.
4. Em **Project Settings → API** (ou na área **Connect** do projeto), copie a **Project URL** e a chave pública **Publishable**. A chave legada `anon` também é pública e pode ser usada.
5. Abra `config.js` e substitua os dois valores de exemplo:

   ```js
   window.INVENTARIO_CONFIG = {
     supabaseUrl: 'https://SEU-PROJETO.supabase.co',
     supabaseKey: 'sb_publishable_SUA_CHAVE_PUBLICA'
   };
   ```

   Use a URL real e a chave inteira. **Nunca coloque uma chave `service_role` ou `sb_secret_` neste arquivo.** O navegador precisa de uma chave pública; o controle de acesso é feito pelo login e pelas políticas RLS do SQL.

## 2. Criar contas dos usuários

1. No painel do Supabase, abra **Authentication → Users** e escolha **Add user**.
2. Crie um usuário para cada pessoa autorizada e defina a senha inicial.
3. Em **Authentication → Settings / Sign In**, desative novos cadastros públicos (*Allow new users to sign up* / *Enable sign-ups*, o nome pode variar). A aplicação não tem botão de cadastro: os acessos são administrados pelo responsável do projeto.
4. Entregue a cada usuário o endereço do site e as credenciais dele.

As políticas do banco permitem que usuários autenticados compartilhem a visualização e edição de todo o inventário. Portanto, crie contas apenas para pessoas autorizadas. O histórico identifica o usuário pelo e-mail presente no token de autenticação.

## 3. Publicar no GitHub Pages

1. Envie **todos** os arquivos e a pasta `icons` deste pacote para a raiz de um repositório GitHub. Inclua também o arquivo `config.js` já preenchido.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha publicar a partir da branch principal (`main` ou equivalente) e da pasta `/ (root)`; salve.
4. Aguarde a publicação do GitHub Pages e abra a URL HTTPS gerada.
5. Teste primeiro com dois navegadores/dispositivos diferentes: entre com contas diferentes, altere o cadastro de um PC e verifique a atualização na outra tela e na aba **Atualizações**.

O GitHub Pages hospeda apenas a interface estática; o Supabase fornece o banco e a sincronização em tempo real. A biblioteca JavaScript do Supabase é carregada de um CDN, então a primeira abertura exige acesso à internet.

## Backup e migração

- **Exportar banco (JSON)** baixa uma cópia do inventário central.
- **Restaurar backup** substitui o inventário compartilhado para todos os usuários. Faça uma exportação antes e use com cuidado.
- O script SQL inclui os dados que estavam na base original. Se já cadastrou dados em uma versão local antiga, exporte um backup dessa versão e restaure-o após testar o banco novo; essa restauração substitui os dados atuais do servidor.

## Diagnóstico rápido

- **“Configure o banco compartilhado”**: confira `config.js`, a URL e a chave pública.
- **E-mail/senha incorretos**: crie ou redefina a conta em Authentication → Users.
- **Erro de tabela/políticas**: execute `supabase-setup.sql` no projeto correto.
- **Não sincroniza entre dispositivos**: confirme que ambos acessam a mesma URL do site e o mesmo projeto Supabase; confirme que o script SQL executou sem erros e que os usuários fizeram login.
- **Atualização aparece só depois de atualizar a página**: verifique no painel do Supabase se as tabelas `sections`, `pcs` e `pc_changes` constam em Database → Publications → `supabase_realtime`. O script SQL tenta habilitá-las automaticamente.

## Arquivos

- `index.html` — tela principal
- `app.js` — lógica da aplicação e sincronização em tempo real
- `styles.css` — interface de celular e computador
- `config.js` — URL e chave pública do projeto Supabase
- `supabase-setup.sql` — tabelas, segurança, histórico automático, Realtime e carga inicial
- `manifest.json`, `sw.js` e `icons/icon.svg` — instalação PWA e cache dos arquivos estáticos
