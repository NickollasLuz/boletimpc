# Inventário de PCs — aplicativo para celular

Aplicação web responsiva/PWA para cadastro e consulta do inventário de computadores, organizada por seção.

## Recursos
- Seções com quantidade de PCs.
- Cadastro, edição e exclusão de computadores.
- Campos de patrimônio/BMP, serial, fabricante, modelo, processador, RAM e sistema operacional.
- Campos extras para usuário, hostname, IP, MAC, disco, monitor e observações.
- Pesquisa dentro da seção.
- Boletim da seção com todos os computadores.
- Impressão do boletim / opção do navegador para salvar como PDF.
- Compartilhamento do boletim pelo celular.
- Backup e restauração em JSON.
- Banco local no navegador (IndexedDB), sem necessidade de servidor de banco para uso local.
- Dados iniciais carregados a partir do arquivo de inventário fornecido.

## Abrir no celular
### Opção 1 — Hospedar em qualquer site
Envie o conteúdo desta pasta para uma hospedagem de site estático (HTTPS). Abra o endereço no Chrome/Safari e use a opção de instalar/adicionar à tela inicial.

### Opção 2 — Servir na rede local usando o computador
Com Python 3 instalado no PC que hospedará a aplicação:

    python -m http.server 8000 --directory .

Depois abra no celular o endereço `http://IP_DO_PC:8000` estando na mesma rede.

Para os recursos completos de PWA/instalação, a publicação em HTTPS é recomendada.

## Observação sobre os dados
Os dados iniciais preservam os campos informados no arquivo fornecido. Informações que não constavam no documento ficam vazias para preenchimento manual.
