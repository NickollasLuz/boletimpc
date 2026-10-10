# Inventário de PCs — Central de TI

Aplicação web responsiva/PWA para cadastro e consulta do inventário de computadores, organizada por seção.

## Interface
- **Celular:** mantém a navegação inferior e o layout compacto original.
- **Computador:** interface ampliada com menu lateral, cabeçalho fixo, cartões organizados em colunas e formulários mais espaçosos.
- A adaptação de desktop entra automaticamente em telas com largura a partir de 1024 px.

## Recursos
- Seções com quantidade de PCs.
- Cadastro, edição e exclusão de computadores.
- Campos de patrimônio/BMP, serial, fabricante, modelo, processador, RAM e sistema operacional.
- Campos extras para usuário, hostname, IP, MAC, disco, monitor e observações.
- Pesquisa dentro da seção.
- Boletim da seção com todos os computadores.
- Impressão do boletim / opção do navegador para salvar como PDF.
- Compartilhamento do boletim.
- Backup e restauração em JSON.
- Banco local no navegador (IndexedDB), sem necessidade de servidor de banco para uso local.
- Dados iniciais carregados a partir do inventário fornecido.

## Como abrir
### Hospedar em um site
Envie os arquivos da pasta para uma hospedagem de site estático com HTTPS. Abra o endereço no navegador e use a opção de instalar/adicionar à tela inicial, se desejar.

### Servir na rede local usando um computador
Com Python 3 instalado no computador que hospedará a aplicação, abra o terminal na pasta e execute:

    python -m http.server 8000

Depois acesse `http://IP_DO_PC:8000` em outro dispositivo da mesma rede.

Para a instalação PWA e o funcionamento completo do service worker, prefira HTTPS ou localhost.

## Dados
Os dados iniciais preservam os campos que estavam informados na base original. Informações não disponíveis ficam vazias para preenchimento manual. Os dados cadastrados ficam no armazenamento local do navegador; exporte um backup JSON para transportá-los para outro dispositivo.
